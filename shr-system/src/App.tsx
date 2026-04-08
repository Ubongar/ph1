import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AppRouter } from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/shared/Toast'
import { PwaNotifier } from './components/shared/PwaNotifier'
import { AppErrorBoundary } from './components/shared/AppErrorBoundary'

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <PwaNotifier />
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
        <Analytics />
      </BrowserRouter>
    </AppErrorBoundary>
  )
}

export default App
