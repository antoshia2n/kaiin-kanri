import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthGuard } from './components/AuthGuard.jsx'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGuard>
      <App />
    </AuthGuard>
  </React.StrictMode>
)
