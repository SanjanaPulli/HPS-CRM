import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Intercept Axios requests to append X-Admin-Name and Authorization headers dynamically
axios.interceptors.request.use(config => {
  const adminName = localStorage.getItem('adminName')
  const adminToken = localStorage.getItem('adminToken')
  if (adminName) {
    config.headers['X-Admin-Name'] = adminName
  }
  if (adminToken) {
    config.headers['Authorization'] = `Bearer ${adminToken}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// Intercept Native Fetch requests to append X-Admin-Name and Authorization headers dynamically
const { fetch: originalFetch } = window
window.fetch = async (...args) => {
  let [resource, config] = args
  const adminName = localStorage.getItem('adminName')
  const adminToken = localStorage.getItem('adminToken')
  if (adminName || adminToken) {
    config = config || {}
    config.headers = config.headers || {}
    if (config.headers instanceof Headers) {
      if (adminName) config.headers.set('X-Admin-Name', adminName)
      if (adminToken) config.headers.set('Authorization', `Bearer ${adminToken}`)
    } else {
      if (adminName) config.headers['X-Admin-Name'] = adminName
      if (adminToken) config.headers['Authorization'] = `Bearer ${adminToken}`
    }
  }
  return originalFetch(resource, config)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)