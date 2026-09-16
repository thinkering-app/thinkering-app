import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Every test opens its own `:memory:` database and takes its clock and ids
    // from an injected context, so files share no state and don't need a
    // process each. better-sqlite3's native binding is fine in a worker thread.
    // Measured: 3.2s -> 2.0s.
    pool: 'threads',
    isolate: false,
  },
})
