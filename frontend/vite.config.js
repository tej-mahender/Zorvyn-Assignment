import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/records': 'http://localhost:3000',
      '/dashboard': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/audit': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
