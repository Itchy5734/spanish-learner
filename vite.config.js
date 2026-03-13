// vite.config.js
// Tells Vite this is a React project and where to find the HTML entry point

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Ensures client-side routing works on Vercel
  // (all URLs serve index.html and React Router handles the rest)
  build: {
    outDir: 'dist'
  }
})
