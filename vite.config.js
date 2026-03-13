import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // This tells Vite to treat .js files as JSX too
      include: '**/*.{jsx,js}',
    })
  ],
  esbuild: {
    // Allow JSX syntax in .js files
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
