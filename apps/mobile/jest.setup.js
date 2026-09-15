// The blocks under test are pure renderers; the one native dependency they can
// reach (the WebView inside a video resourceEmbed) stands in as a plain view.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native')
  return { WebView: View }
})
