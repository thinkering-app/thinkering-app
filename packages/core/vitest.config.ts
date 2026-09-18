import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Core is pure functions over an injected context — no module mocks, no
    // global stubbing, nothing to leak between files — so the default
    // process-per-file isolation buys nothing and costs most of the runtime.
    // Measured: 2.4s -> 0.8s.
    pool: 'threads',
    isolate: false,
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
