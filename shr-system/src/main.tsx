import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMockData } from './data/mockData'
import { initializeOfflineSync } from './services/offlineSync'
import './index.css'
import App from './App'

initializeMockData()
initializeOfflineSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
