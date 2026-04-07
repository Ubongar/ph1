import { runOfflineSync } from './offlineSync';

let started = false;

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

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
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
