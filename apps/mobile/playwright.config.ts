import { defineConfig, devices } from '@playwright/test'

// Conductor runs several workspaces at once, each with its own `dist` — PORT
// lets a second one test the web export without colliding on 4173.
const port = Number(process.env.PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // One browser at a time. The web build's synchronous queries block the page's
  // main thread while its SQLite worker answers, and that call has a fixed time
  // budget — a loaded machine running several browsers spends it and the query
  // fails for reasons that have nothing to do with the code under test.
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-web.mjs',
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    // The other engine the web build actually ships to. WebKit is where the
    // worker, OPFS and SharedArrayBuffer behaviour diverges from Chromium, and
    // divergences there take the whole app down rather than degrade it.
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
})
