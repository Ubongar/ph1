import { useEffect, useRef } from 'react';
import { useToast } from '../../hooks';
import {
  PWA_EVENT_APP_INSTALLED,
  PWA_EVENT_OFFLINE_READY,
  PWA_EVENT_UPDATE_AVAILABLE,
} from '../../services/registerServiceWorker';

export function PwaNotifier() {
  const { toast } = useToast();
  const hasShownOfflineReady = useRef(false);

  useEffect(() => {
    function onOfflineReady() {
      if (hasShownOfflineReady.current) return;
      hasShownOfflineReady.current = true;
      toast('Offline mode is ready. You can keep working without network.', 'success');
    }

    function onUpdateAvailable() {
      toast('A new app update is available. Refresh this page to get the latest version.', 'info');
    }

    function onAppInstalled() {
      toast('App installed successfully. You can open it from your device home screen.', 'success');
    }

    window.addEventListener(PWA_EVENT_OFFLINE_READY, onOfflineReady);
    window.addEventListener(PWA_EVENT_UPDATE_AVAILABLE, onUpdateAvailable);
    window.addEventListener(PWA_EVENT_APP_INSTALLED, onAppInstalled);

    return () => {
      window.removeEventListener(PWA_EVENT_OFFLINE_READY, onOfflineReady);
      window.removeEventListener(PWA_EVENT_UPDATE_AVAILABLE, onUpdateAvailable);
      window.removeEventListener(PWA_EVENT_APP_INSTALLED, onAppInstalled);
    };
  }, [toast]);

  return null;
}
