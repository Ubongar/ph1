import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMockData } from './data/mockData'
import { initializeOfflineSync } from './services/offlineSync'
import { registerServiceWorker } from './services/registerServiceWorker'
import './index.css'
import App from './App'

initializeMockData()
initializeOfflineSync()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
