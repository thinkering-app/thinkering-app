// The blocks under test are pure renderers; the one native dependency they can
// reach (the WebView inside a video resourceEmbed) stands in as a plain view.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native')
  return { WebView: View }
})

// The loading dots animate with Reanimated, whose native half isn't there under jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
