import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { daysSinceInstallBucket, sanitizeFeedbackContext } from '@thinkering/core'

import { appVersion } from './client'
import { installedAt, track } from './track'

/**
 * `app_opened` (docs/08): once per launch, and again whenever the app comes
 * back to the foreground — the closest thing to a session count that carries
 * nothing about the person. Waits for `ready`, since the buffer it writes to
 * doesn't exist until migrations have run.
 */
export function useAppOpened(ready: boolean): void {
  useEffect(() => {
    if (!ready) return
    const fire = () => {
      try {
        const { platform, appVersion: version } = sanitizeFeedbackContext({
          platform: Platform.OS,
          appVersion: appVersion(),
        })
        track('app_opened', {
          platform,
          app_version: version,
          days_since_install: daysSinceInstallBucket(installedAt(), Date.now()),
        })
      } catch {
        // `track` guards itself, but `installedAt` reads and writes the settings
        // table out here. Same rule: telemetry never takes a screen down with it.
      }
    }
    fire()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fire()
    })
    return () => subscription.remove()
  }, [ready])
}
