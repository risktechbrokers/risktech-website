// main.jsx — Entry point of the React app
// This is what Vite uses to "boot up" your website
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // Global styles + Tailwind
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
