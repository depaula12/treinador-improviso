import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import { ErrorBoundary, installErrorLog } from './ui/errors'

installErrorLog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary area="app">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
