import { defineConfig, devices } from '@playwright/test'

// Conductor runs several workspaces at once, each with its own `dist` — PORT
// lets a second one test the web export without colliding on 4173.
const port = Number(process.env.PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
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
  ],
})
