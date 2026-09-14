import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Real suites arrive with WP1.2 (scheduler, schemas); M0 only wires the runner.
    passWithNoTests: true,
  },
})
