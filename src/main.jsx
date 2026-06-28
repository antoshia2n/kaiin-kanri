import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard.jsx'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGuard>
        <App />
      </AuthGuard>
    </BrowserRouter>
  </React.StrictMode>
)
