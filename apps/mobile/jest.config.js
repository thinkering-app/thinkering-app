const preset = require('jest-expo/jest-preset')

/**
 * Renderer tests (docs/10 Tier 4): one behavioral test per activity block kind
 * and the unknown-kind placeholder, plus the AI client's retry and repair
 * rules. Deliberately not screen snapshots or styling assertions — those cost
 * more than the bugs they catch.
 */
module.exports = {
  preset: 'jest-expo',
  // The first render in a suite pulls in the lazy half of the react-native +
  // nativewind module graph. On a cold jest cache — always, in CI — that lands
  // inside the first test and has been measured anywhere from 4s to 20s+
  // depending on what else the machine is doing; every test after it is
  // milliseconds. A ceiling generous enough not to flake, not a budget: the
  // whole suite runs in ~3s warm.
  testTimeout: 60_000,
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
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
