import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GlobalErrorBoundary } from './components/ui/GlobalErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>,
)
