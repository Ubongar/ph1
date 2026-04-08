import { StorageKey } from './storage';

type ClientErrorSource = 'error-boundary' | 'window-error' | 'unhandled-rejection';

interface ClientErrorReport {
  id: string;
  timestamp: string;
  source: ClientErrorSource;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  currentUserId: string | null;
  context?: Record<string, unknown>;
}

const REPORTS_KEY = 'shr_client_error_reports';
const MAX_REPORTS = 30;

let globalErrorHandlersRegistered = false;

function readReports(): ClientErrorReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientErrorReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReports(reports: ClientErrorReport[]): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(-MAX_REPORTS)));
}

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown client error',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown client error payload' };
}

function sendToApi(report: ClientErrorReport): void {
  try {
    const payload = JSON.stringify(report);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/client-errors', blob);
      return;
    }

    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Report shipping is best effort only.
  }
}

export function captureClientError(
  source: ClientErrorSource,
  error: unknown,
  context?: Record<string, unknown>,
): ClientErrorReport {
  const normalized = normalizeError(error);

  const report: ClientErrorReport = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source,
    message: normalized.message,
    stack: normalized.stack,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    currentUserId: typeof localStorage !== 'undefined' ? localStorage.getItem(StorageKey.AUTH_SESSION) : null,
    context,
  };

  const existing = readReports();
  existing.push(report);
  writeReports(existing);
  sendToApi(report);

  return report;
}

export function registerGlobalErrorHandlers(): void {
  if (globalErrorHandlersRegistered || typeof window === 'undefined') return;
  globalErrorHandlersRegistered = true;

  window.addEventListener('error', (event) => {
    captureClientError('window-error', event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureClientError('unhandled-rejection', event.reason, {
      reasonType: typeof event.reason,
    });
  });
}
