import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
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
