import { BrowserRouter } from 'react-router-dom'
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
    </BrowserRouter>
  )
}

export default App
