import type { ExpoConfig } from 'expo/config'
import preset from '@thinkering/config/tailwind'

const { colors } = preset.theme.extend

const config: ExpoConfig = {
  name: 'thinkering',
  slug: 'thinkering',
  version: '0.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'thinkering',
  // Dark mode is out of scope for v1 (docs/07).
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: colors.paper,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: colors.paper,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
}

export default config
