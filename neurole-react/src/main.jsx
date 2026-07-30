import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Single config source of truth — also sets window.NEUROLE_CONFIG, which the
// game pages read. Imported first so the global exists before anything renders.
import './config.js'
import './index.css'
import './style.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
