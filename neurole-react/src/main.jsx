import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Single config source of truth — also sets window.NEUROLE_CONFIG, which the
// game pages read. Imported first so the global exists before anything renders.
import './config.js'
import './index.css'
import './style.css'
import App from './App.jsx'

// Arm the scroll reveal before the first render, so cards mount already hidden
// instead of painting once and then snapping out of view. Declining to set the
// class is what turns the whole effect off, so reduced-motion visitors and
// browsers without IntersectionObserver simply get a static page.
try {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-ready')
  }
} catch { /* leave the page unrevealed and fully visible */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
