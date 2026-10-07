import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Chromium für den Browser-Modus finden.
 * Normalfall: `npx playwright install chromium` – Playwright findet den Browser selbst.
 * Fallback: ein vorhandenes Chromium unter PLAYWRIGHT_BROWSERS_PATH (z. B. CI-Images),
 * dessen Build-Nummer nicht zur Playwright-Version passt. Explizit per VITEST_CHROMIUM setzbar.
 */
function findChromium(): string | undefined {
  if (process.env.VITEST_CHROMIUM) return process.env.VITEST_CHROMIUM
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !fs.existsSync(root)) return undefined
  const dir = fs
    .readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .at(-1)
  const candidate = dir && path.join(root, dir, 'chrome-linux', 'chrome')
  return candidate && fs.existsSync(candidate) ? candidate : undefined
}

// Eigene Test-Konfiguration: vite.config.ts enthält Build-Plugins (FontAwesome-
// Subset, CSS-Inlining), die für Tests nicht gebraucht werden.
const shared = {
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
}

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        // Reine Logik und Komponenten ohne Canvas: schnell, in happy-dom
        ...shared,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['tests/unit/**/*.spec.ts'],
          restoreMocks: true,
        },
      },
      {
        // Alles, was einen echten 2D-Canvas und Layout braucht (z. B. Bild-Editor)
        ...shared,
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.spec.ts'],
          restoreMocks: true,
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            screenshotFailures: false,
            instances: [
              {
                browser: 'chromium',
                launch: { executablePath: findChromium(), args: ['--no-sandbox'] },
              },
            ],
          },
        },
      },
    ],
  },
})
