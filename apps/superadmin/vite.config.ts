import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Gagal cepat kalau port dipakai (jangan geser diam-diam: HMR + API_BASE
    // mengasumsikan port ini).
    strictPort: true,
    proxy: {
      '/companyprofile': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/roles': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/modules': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/superadmin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ppdb': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
