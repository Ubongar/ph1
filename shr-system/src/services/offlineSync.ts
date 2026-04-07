import type {
  OfflineConflict,
  OfflineConflictResolution,
  OfflineMutation,
  OfflineMutationAction,
  OfflineSyncBundle,
  OfflineSyncRunSummary,
  OfflineSyncSnapshot,
  UserRole,
} from '../types/types';

interface SyncBatchResult {
  mutationId: string;
  status: 'synced' | 'failed' | 'conflict';
  syncedAt?: string;
  reason?: string;
  remoteValue?: unknown;
  serverConflictId?: string;
}

interface SyncBatchResponse {
  processedAt: string;
  results: SyncBatchResult[];
}

interface AuthTokenResponse {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  issuedAt: number;
  expiresAt: number;
  user: { id: string; role: UserRole };
}

export interface ServerReconciliationConflict {
  id: string;
  mutationId: string;
  storageKey: string;
  entityId: string;
  reason: string;
  localValue: unknown;
  remoteValue: unknown;
  status: 'pending' | 'resolved';
  resolution?: 'keep_local' | 'keep_remote';
  createdAt: string;
  resolvedAt?: string;
}

export interface ServerAdminAuditLog {
  id: string;
  timestamp: string;
  adminUserId: string;
  adminRole: UserRole;
  action: string;
  conflictId: string;
  mutationId: string;
  storageKey: string;
  entityId: string;
  decision: 'keep_local' | 'keep_remote';
  reason: string;
}

const OUTBOX_KEY = 'shr_offline_outbox';
const CONFLICTS_KEY = 'shr_offline_conflicts';
const LAST_SYNC_AT_KEY = 'shr_offline_last_synced_at';
const DEVICE_ID_KEY = 'shr_offline_device_id';
const AUTH_TOKEN_KEY = 'shr_api_auth_token';
const USERS_KEY = 'shr_system_users';
const AUTH_SESSION_KEY = 'shr_auth_session';
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

type SyncListener = (snapshot: OfflineSyncSnapshot) => void;

const listeners = new Set<SyncListener>();
let isInitialized = false;

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getOutbox(): OfflineMutation[] {
  return readJSON<OfflineMutation[]>(OUTBOX_KEY, []);
}

function setOutbox(outbox: OfflineMutation[]): void {
  writeJSON(OUTBOX_KEY, outbox);
}

function getConflicts(): OfflineConflict[] {
  return readJSON<OfflineConflict[]>(CONFLICTS_KEY, []);
}

function setConflicts(conflicts: OfflineConflict[]): void {
  writeJSON(CONFLICTS_KEY, conflicts);
}

function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_AT_KEY);
}

function setLastSyncedAt(value: string): void {
  localStorage.setItem(LAST_SYNC_AT_KEY, value);
}

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function getCurrentAuditUser(): { userId: string; userRole: UserRole } {
  const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
  const users = readJSON<Array<{ id: string; role: UserRole }>>(USERS_KEY, []);
  const currentUser = sessionUserId ? users.find((user) => user.id === sessionUserId) : null;

  if (currentUser) {
    return { userId: currentUser.id, userRole: currentUser.role };
  }

  return { userId: 'system', userRole: 'admin' };
}

function emitSnapshot(): void {
  const snapshot = getOfflineSyncSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

function upsertLocalConflict(mutation: OfflineMutation, reason: string, remoteValue: unknown): OfflineConflict {
  const conflicts = getConflicts();
  const existing = conflicts.find((item) => item.mutationId === mutation.id && item.resolution === 'pending');
  if (existing) {
    existing.reason = reason;
    existing.remoteValue = remoteValue;
    setConflicts(conflicts);
    return existing;
  }

  const created: OfflineConflict = {
    id: crypto.randomUUID(),
    mutationId: mutation.id,
    storageKey: mutation.storageKey,
    entityId: mutation.entityId,
    reason,
    localValue: mutation.payload,
    remoteValue,
    detectedAt: new Date().toISOString(),
    resolution: 'pending',
  };
  conflicts.push(created);
  setConflicts(conflicts);
  return created;
}

function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadRaw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (payloadRaw.length % 4)) % 4);
    const decoded = atob(payloadRaw + padding);
    const payload = JSON.parse(decoded) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function getCachedAuthToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  const exp = parseJwtExpiry(token);
  if (!exp) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now >= exp - 30) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
  return token;
}

async function issueAuthToken(): Promise<string> {
  const identity = getCurrentAuditUser();
  const response = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'x-shr-user-id': identity.userId,
      'x-shr-user-role': identity.userRole,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Auth token request failed with status ${response.status}`);
  }

  const payload = await response.json() as AuthTokenResponse;
  localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
  return payload.token;
}

async function ensureAuthToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = getCachedAuthToken();
    if (cached) return cached;
  }
  return issueAuthToken();
}

async function fetchWithAuth(path: string, init: RequestInit, allowRetry = true): Promise<Response> {
  const token = await ensureAuthToken(false);
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && allowRetry) {
    const refreshedToken = await ensureAuthToken(true);
    const retryHeaders = new Headers(init.headers ?? {});
    retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: retryHeaders,
    });
  }

  return response;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetchWithAuth(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function subscribeOfflineSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(getOfflineSyncSnapshot());
  return () => listeners.delete(listener);
}

export function getOfflineSyncSnapshot(): OfflineSyncSnapshot {
  const outbox = getOutbox();
  const conflicts = getConflicts();
  const pendingCount = outbox.filter((m) => m.status === 'pending').length;
  const failedCount = outbox.filter((m) => m.status === 'failed').length;
  const conflictCount = conflicts.filter((c) => c.resolution === 'pending').length;

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount,
    failedCount,
    conflictCount,
    lastSyncedAt: getLastSyncedAt(),
    outbox,
    conflicts,
  };
}

export function enqueueOfflineMutation(input: {
  storageKey: string;
  entityId: string;
  action: OfflineMutationAction;
  payload: unknown;
  beforeSnapshot?: unknown;
}): void {
  const outbox = getOutbox();
  const user = getCurrentAuditUser();
  outbox.push({
    id: crypto.randomUUID(),
    storageKey: input.storageKey,
    entityId: input.entityId,
    action: input.action,
    payload: input.payload,
    beforeSnapshot: input.beforeSnapshot,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    queuedByUserId: user.userId,
    queuedByRole: user.userRole,
    deviceId: getDeviceId(),
  });
  setOutbox(outbox);
  emitSnapshot();
}

export async function runOfflineSync(): Promise<OfflineSyncRunSummary> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      processed: 0,
      synced: 0,
      conflicts: 0,
      failed: 0,
      skipped: 0,
      lastSyncedAt: getLastSyncedAt(),
    };
  }

  const outbox = getOutbox();
  const candidates = outbox.filter((item) => item.status === 'pending' || item.status === 'failed');
  if (candidates.length === 0) {
    return {
      processed: outbox.length,
      synced: 0,
      conflicts: 0,
      failed: 0,
      skipped: outbox.filter((item) => item.status !== 'pending' && item.status !== 'failed').length,
      lastSyncedAt: getLastSyncedAt(),
    };
  }

  candidates.forEach((mutation) => {
    mutation.attempts += 1;
  });
  setOutbox(outbox);

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  try {
    const response = await postJson<SyncBatchResponse>('/sync/batch', {
      deviceId: getDeviceId(),
      mutations: candidates,
    });

    const byId = new Map(response.results.map((result) => [result.mutationId, result]));
    for (const mutation of candidates) {
      const result = byId.get(mutation.id);
      if (!result) {
        mutation.status = 'failed';
        mutation.lastError = 'Mutation result missing from server response.';
        failed += 1;
        continue;
      }

      if (result.status === 'synced') {
        mutation.status = 'synced';
        mutation.syncedAt = result.syncedAt ?? response.processedAt;
        mutation.lastError = undefined;
        synced += 1;
        continue;
      }

      if (result.status === 'conflict') {
        mutation.status = 'conflict';
        mutation.lastError = result.reason ?? 'Conflict returned by server.';
        const localConflict = upsertLocalConflict(mutation, mutation.lastError, result.remoteValue ?? null);
        if (result.serverConflictId) {
          localConflict.reason = `${localConflict.reason} [server:${result.serverConflictId}]`;
          const allConflicts = getConflicts();
          const idx = allConflicts.findIndex((item) => item.id === localConflict.id);
          if (idx >= 0) {
            allConflicts[idx] = localConflict;
            setConflicts(allConflicts);
          }
        }
        conflicts += 1;
        continue;
      }

      mutation.status = 'failed';
      mutation.lastError = result.reason ?? 'Server rejected mutation.';
      failed += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync request failed.';
    for (const mutation of candidates) {
      mutation.status = 'failed';
      mutation.lastError = message;
      failed += 1;
    }
  }

  setOutbox(outbox);

  if (synced > 0) {
    setLastSyncedAt(new Date().toISOString());
  }

  emitSnapshot();

  return {
    processed: outbox.length,
    synced,
    conflicts,
    failed,
    skipped: outbox.filter((item) => item.status !== 'pending' && item.status !== 'failed').length,
    lastSyncedAt: getLastSyncedAt(),
  };
}

export function resolveOfflineConflict(conflictId: string, resolution: Exclude<OfflineConflictResolution, 'pending'>): void {
  const conflicts = getConflicts();
  const outbox = getOutbox();
  const conflict = conflicts.find((item) => item.id === conflictId);
  if (!conflict || conflict.resolution !== 'pending') return;

  conflict.resolution = resolution;
  conflict.resolvedAt = new Date().toISOString();

  const mutation = outbox.find((item) => item.id === conflict.mutationId);
  if (mutation) {
    if (resolution === 'keep_local') {
      mutation.status = 'pending';
      mutation.lastError = undefined;
      mutation.beforeSnapshot = conflict.remoteValue;
    } else {
      mutation.status = 'discarded';
      mutation.lastError = 'Discarded after conflict review.';
    }
  }

  setConflicts(conflicts);
  setOutbox(outbox);
  emitSnapshot();
}

export function retryFailedOfflineMutations(): void {
  const outbox = getOutbox();
  outbox.forEach((mutation) => {
    if (mutation.status === 'failed') {
      mutation.status = 'pending';
      mutation.lastError = undefined;
    }
  });
  setOutbox(outbox);
  emitSnapshot();
}

export async function fetchServerReconciliationConflicts(): Promise<ServerReconciliationConflict[]> {
  const authorizedResponse = await fetchWithAuth('/admin/reconciliation/conflicts', {
    method: 'GET',
  });
  if (!authorizedResponse.ok) {
    throw new Error(`Failed to load server conflicts (${authorizedResponse.status})`);
  }
  const payload = await authorizedResponse.json() as { conflicts: ServerReconciliationConflict[] };
  return payload.conflicts;
}

export async function resolveServerReconciliationConflict(conflictId: string, resolution: 'keep_local' | 'keep_remote'): Promise<void> {
  await postJson('/admin/reconciliation/resolve', { conflictId, resolution });
}

export async function fetchServerAdminAuditLogs(): Promise<ServerAdminAuditLog[]> {
  const response = await fetchWithAuth('/admin/audit-logs', {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to load server audit logs (${response.status})`);
  }
  const payload = await response.json() as { logs: ServerAdminAuditLog[] };
  return payload.logs;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function buildOfflineBundle(passphrase: string): Promise<OfflineSyncBundle> {
  const payload = {
    outbox: getOutbox().filter((mutation) => mutation.status === 'pending' || mutation.status === 'failed' || mutation.status === 'conflict'),
    conflicts: getConflicts(),
    createdAt: new Date().toISOString(),
  };

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  return {
    bundleVersion: 1,
    exportedAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    saltB64: encodeBase64(salt),
    ivB64: encodeBase64(iv),
    encryptedPayloadB64: encodeBase64(new Uint8Array(encrypted)),
  };
}

export async function downloadOfflineBundle(passphrase: string): Promise<string> {
  const bundle = await buildOfflineBundle(passphrase);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `offline_bundle_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return bundle.exportedAt;
}

export async function importOfflineBundle(rawBundleText: string, passphrase: string): Promise<{ importedMutations: number; importedConflicts: number }> {
  const parsed = JSON.parse(rawBundleText) as OfflineSyncBundle;
  if (parsed.bundleVersion !== 1) {
    throw new Error('Unsupported bundle version.');
  }

  const salt = decodeBase64(parsed.saltB64);
  const iv = decodeBase64(parsed.ivB64);
  const payloadBytes = decodeBase64(parsed.encryptedPayloadB64);
  const key = await deriveAesKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    payloadBytes,
  );

  const decoded = new TextDecoder().decode(new Uint8Array(decrypted));
  const payload = JSON.parse(decoded) as { outbox: OfflineMutation[]; conflicts: OfflineConflict[] };

  const existingOutbox = getOutbox();
  const existingConflictIds = new Set(getConflicts().map((item) => item.id));
  const existingOutboxIds = new Set(existingOutbox.map((item) => item.id));

  const mergedOutbox = [...existingOutbox];
  let importedMutations = 0;
  for (const mutation of payload.outbox) {
    if (existingOutboxIds.has(mutation.id)) continue;
    mergedOutbox.push(mutation);
    importedMutations += 1;
  }

  const existingConflicts = getConflicts();
  const mergedConflicts = [...existingConflicts];
  let importedConflicts = 0;
  for (const conflict of payload.conflicts) {
    if (existingConflictIds.has(conflict.id)) continue;
    mergedConflicts.push(conflict);
    importedConflicts += 1;
  }

  setOutbox(mergedOutbox);
  setConflicts(mergedConflicts);
  emitSnapshot();

  return { importedMutations, importedConflicts };
}

export function initializeOfflineSync(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  const onOnline = () => {
    void runOfflineSync();
  };

  const onOffline = () => emitSnapshot();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  if (navigator.onLine) {
    void runOfflineSync();
  }

  emitSnapshot();
}
