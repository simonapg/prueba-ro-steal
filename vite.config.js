import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/ragnapi': {
        target: 'https://ragnapi.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ragnapi/, '')
      },
      '/api/irowiki': {
        target: 'https://db.irowiki.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/irowiki/, '')
      },
      '/api/rms': {
        target: 'https://ratemyserver.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/rms/, '')
      }
    }
  }
})
