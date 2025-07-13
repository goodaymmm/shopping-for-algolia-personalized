import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      '@main': fileURLToPath(new URL('./src/main', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url))
    }
  },
  server: {
    port: 5173
  }
})