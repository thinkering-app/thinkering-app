import { requireOptionalNativeModule } from 'expo'

/** What the iOS module reports (`ios/ReleaseChannelModule.swift`). */
export type NativeReleaseChannel = 'simulator' | 'internal' | 'testflight' | 'app_store'

type ReleaseChannelModule = { channel: NativeReleaseChannel }

/**
 * Null on web, Android, and any dev client built before the module existed —
 * optional, so an old build falls back instead of crashing.
 */
export function nativeReleaseChannel(): NativeReleaseChannel | null {
  return requireOptionalNativeModule<ReleaseChannelModule>('ReleaseChannel')?.channel ?? null
}
