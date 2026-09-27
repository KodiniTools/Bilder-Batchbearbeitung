import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { faIconSubset, inlineEntryCss } from './vite-plugins/critical-css'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  base: '/bilderseriebearbeiten/',
  plugins: [
    vue(),
    // Gegen render-blockierendes CSS: nur genutzte FontAwesome-Icons, Einstiegs-CSS inline
    faIconSubset({
      roots: ['src', 'index.html'],
      exclude: ['src/lib/bildseriebearbeiten'],
    }),
    inlineEntryCss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 3000,
  },
})
