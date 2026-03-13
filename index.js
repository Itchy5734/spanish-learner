// ─────────────────────────────────────────────────────────
//  src/index.js
//  The entry point. React mounts the App into the HTML page.
// ─────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Remove default browser margins
document.body.style.margin = '0'
document.body.style.padding = '0'
document.body.style.boxSizing = 'border-box'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
