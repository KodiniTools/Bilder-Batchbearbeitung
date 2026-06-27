import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Electron build config – uses relative paths for file:// protocol
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  worker: {
    format: 'es'
  },
  build: {
    // Electron Chromium supports modern JS – no need for legacy transpilation
    target: 'chrome120',
    rollupOptions: {
      output: {
        // Deterministic chunk names for electron-builder file inclusion
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
