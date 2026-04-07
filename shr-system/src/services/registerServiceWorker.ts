import { runOfflineSync } from './offlineSync';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWA_EVENT_INSTALL_AVAILABILITY = 'shr:pwa-install-availability';
export const PWA_EVENT_OFFLINE_READY = 'shr:pwa-offline-ready';
export const PWA_EVENT_UPDATE_AVAILABLE = 'shr:pwa-update-available';
export const PWA_EVENT_APP_INSTALLED = 'shr:pwa-app-installed';

let started = false;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let installAvailable = false;

function emitPwaEvent(name: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function setInstallAvailable(nextValue: boolean): void {
  installAvailable = nextValue;
  emitPwaEvent(PWA_EVENT_INSTALL_AVAILABILITY, { available: nextValue });
}

export function isPwaInstallAvailable(): boolean {
  return installAvailable;
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) return 'unavailable';

  await deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  setInstallAvailable(false);
  return outcome;
}

async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const withSync = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (!withSync.sync) return;
    await withSync.sync.register('shr-sync-outbox');
  } catch {
    // Background sync is optional; online/offline events still trigger sync in the app.
  }
}

export function registerServiceWorker(): void {
  if (started || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  started = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    setInstallAvailable(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallAvailable(false);
    emitPwaEvent(PWA_EVENT_APP_INSTALLED);
  });

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        emitPwaEvent(PWA_EVENT_UPDATE_AVAILABLE);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state !== 'installed') return;
          if (navigator.serviceWorker.controller) {
            emitPwaEvent(PWA_EVENT_UPDATE_AVAILABLE);
            return;
          }
          emitPwaEvent(PWA_EVENT_OFFLINE_READY);
        });
      });
    });
    void registerBackgroundSync();
  });

  window.addEventListener('online', () => {
    void registerBackgroundSync();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_OFFLINE_SYNC') {
      void runOfflineSync();
    }
  });
}
