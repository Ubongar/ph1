import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AppRouter } from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/shared/Toast'
import { PwaNotifier } from './components/shared/PwaNotifier'

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <PwaNotifier />
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
      <Analytics />
    </BrowserRouter>
  )
}

export default App
