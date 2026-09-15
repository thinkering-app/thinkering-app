import type { ExpoConfig } from 'expo/config'
import preset from '@thinkering/config/tailwind'

const { colors } = preset.theme.extend

const config: ExpoConfig = {
  name: 'thinkering',
  // `slug` and `owner` must match the EAS project (`eas init` created
  // thinkering-app/thinkering-v1); `extra.eas.projectId` is what links a build
  // to it. All three live here rather than in a root app.json — the Expo app is
  // this workspace, not the repo root.
  slug: 'thinkering-v1',
  owner: 'thinkering-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'thinkering',
  // Dark mode is out of scope for v1 (docs/07).
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'app.thinkering',
    // No `.icon` bundle yet: the Liquid Glass layered format can't be reviewed
    // without a device build, so iOS renders `icon.png` (docs/07).
  },
  android: {
    package: 'app.thinkering',
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
    'expo-sharing',
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
  extra: {
    eas: { projectId: '79d41ec7-1bf4-44ce-8f85-147fadc2fcd6' },
  },
}

export default config
