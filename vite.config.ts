import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { faIconSubset, inlineEntryCss } from './vite-plugins/critical-css'
import { base64Asset } from './vite-plugins/base64-asset'
import { localizedHtml } from './vite-plugins/localized-html'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  base: '/bilderseriebearbeiten/',
  plugins: [
    vue(),
    // Gegen render-blockierendes CSS: nur genutzte FontAwesome-Icons, Einstiegs-CSS inline
    faIconSubset({ roots: ['src', 'index.html'] }),
    inlineEntryCss(),
    // PDF-Schriften als Base64-Chunks (src/lib/features/pdf-fonts.ts)
    base64Asset(),
    // seo/<route>.<lang>.html mit fertigem Meta für Crawler ohne JS (NGINX: DEPLOY.md)
    localizedHtml({
      messages: { de: readJson('./src/locales/de.json'), en: readJson('./src/locales/en.json') },
    }),
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
