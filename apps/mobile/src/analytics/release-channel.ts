import { Platform } from 'react-native'
import { nativeReleaseChannel } from '../../modules/release-channel'

/**
 * Which kind of build sent an event (docs/08 §Release channel), registered on
 * the client so every event and recording carries it. It's the same for
 * everyone on a channel, so it says nothing about the person.
 */
export type ReleaseChannel =
  'development' | 'internal' | 'testflight' | 'app_store' | 'web' | 'unknown'

export function releaseChannel(): ReleaseChannel {
  if (__DEV__) return 'development'
  if (Platform.OS === 'web') return 'web'
  switch (nativeReleaseChannel()) {
    // A release build on a simulator is the e2e profile.
    case 'simulator':
      return 'development'
    case 'internal':
      return 'internal'
    case 'testflight':
      return 'testflight'
    case 'app_store':
      return 'app_store'
    // Android, until it has a store to tell apart.
    case null:
      return 'unknown'
  }
}
