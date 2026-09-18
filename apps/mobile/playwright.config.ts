import { defineConfig, devices } from '@playwright/test'

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
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-web.mjs',
    url: 'http://127.0.0.1:4173',
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
