const preset = require('jest-expo/jest-preset')

/**
 * Renderer tests (docs/10 Tier 4): one behavioral test per activity block kind
 * and the unknown-kind placeholder. Deliberately not screen snapshots or
 * styling assertions — those cost more than the bugs they catch.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // The preset's list, plus the packages our components pull in.
  transformIgnorePatterns: [
    preset.transformIgnorePatterns[0].replace(
      '|standard-navigation',
      '|standard-navigation|nativewind|react-native-css-interop|react-native-webview',
    ),
    ...preset.transformIgnorePatterns.slice(1),
  ],
}
