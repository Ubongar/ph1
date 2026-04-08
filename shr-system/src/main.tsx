import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMockData } from './data/mockData'
import { initializeOfflineSync } from './services/offlineSync'
import { registerServiceWorker } from './services/registerServiceWorker'
import { StorageKey } from './services/storage'
import './index.css'
import App from './App'

const RECOVERABLE_STORAGE_KEYS = [
  ...Object.values(StorageKey),
  'shr_initialized',
  'shr_alert_read_ids',
  'shr_sidebar_collapsed',
  'shr_offline_outbox',
  'shr_offline_conflicts',
  'shr_offline_last_synced_at',
  'shr_offline_device_id',
  'shr_api_auth_token',
]

function bootstrapMockDataSafely() {
  try {
    initializeMockData()
  } catch {
    RECOVERABLE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
    initializeMockData()
  }
}

bootstrapMockDataSafely()
initializeOfflineSync()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
