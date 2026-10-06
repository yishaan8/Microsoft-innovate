import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['terminal.local'],
    proxy: {
      '/ap': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/model': 'http://127.0.0.1:8000',
      '/risk': 'http://127.0.0.1:8000',
      '/audit-log': 'http://127.0.0.1:8000',
    },
  },
})
