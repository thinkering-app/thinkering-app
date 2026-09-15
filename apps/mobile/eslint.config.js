const expo = require('eslint-config-expo/flat')
const prettier = require('eslint-config-prettier')

module.exports = [
  ...expo,
  prettier,
  {
    // Jest globals for the renderer tests (docs/10 Tier 4) and their setup file.
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' },
    },
  },
  { ignores: ['dist/**', '.expo/**'] },
]
