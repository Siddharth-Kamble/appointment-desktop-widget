import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'        // ← ADD THIS LINE
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)