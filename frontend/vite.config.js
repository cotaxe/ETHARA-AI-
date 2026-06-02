import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://backend:8000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'build'
  },
  define: {
    'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:8000')
  }
})
