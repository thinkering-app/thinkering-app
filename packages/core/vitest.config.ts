import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // Off locally, on in CI. Thresholds are global, so a focused run
      // (`pnpm test src/scheduler`) would otherwise "fail" at 20% coverage
      // with nothing wrong — the fastest inner loop looking like a red test.
      // `pnpm test:cov` turns it on by hand.
      enabled: !!process.env.CI,
      provider: 'v8',
      // Thresholds only where bugs are expensive (docs/10): scheduler and schemas.
      include: ['src/scheduler/**', 'src/schemas/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      reporter: ['text-summary'],
    },
  },
})
