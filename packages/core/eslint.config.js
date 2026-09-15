import core from '@thinkering/config/eslint/core'

export default [
  ...core,
  {
    // Dev scripts (prompt:run / prompt:check) run live outside the app; the
    // injected-clock determinism rule guards src/ only.
    files: ['scripts/**'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },
]
