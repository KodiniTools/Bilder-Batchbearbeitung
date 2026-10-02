import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Eigene Test-Konfiguration: vite.config.ts enthält Build-Plugins (FontAwesome-
// Subset, CSS-Inlining), die für Tests nicht gebraucht werden.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts'],
    restoreMocks: true,
  },
})
