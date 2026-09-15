import { useMemo } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { usePathname } from 'expo-router'
import { coarseScreen, sanitizeFeedbackContext, type FeedbackContext } from '@thinkering/core'

/**
 * The only app details feedback may carry (docs/01 §2, docs/08): which coarse
 * screen the user was on, the platform, and the app version. The route's ids
 * never survive `coarseScreen`, and the allowlist is enforced again on the
 * server.
 */
export function useFeedbackContext(): FeedbackContext {
  const pathname = usePathname()
  return useMemo(
    () =>
      sanitizeFeedbackContext({
        screen: coarseScreen(pathname),
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? '',
      }),
    [pathname],
  )
}

/** The line shown above "Include app details" — what sending would attach, verbatim. */
export function describeFeedbackContext(context: FeedbackContext): string {
  return `${context.screen} · ${context.platform} ${context.appVersion}`
}
