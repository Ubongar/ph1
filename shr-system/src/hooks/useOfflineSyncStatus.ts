import { useEffect, useState } from 'react';
import { getOfflineSyncSnapshot, subscribeOfflineSync } from '../services/offlineSync';
import type { OfflineSyncSnapshot } from '../types/types';

export function useOfflineSyncStatus(): OfflineSyncSnapshot {
  const [snapshot, setSnapshot] = useState<OfflineSyncSnapshot>(() => getOfflineSyncSnapshot());

  useEffect(() => subscribeOfflineSync(setSnapshot), []);

  return snapshot;
}
