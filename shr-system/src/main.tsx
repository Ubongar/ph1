import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeMockData } from './data/mockData'
import './index.css'
import App from './App'

initializeMockData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
