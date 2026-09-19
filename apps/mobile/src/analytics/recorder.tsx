import type { ReactNode } from 'react'
import { PostHogMaskView } from 'posthog-react-native'
import { analyticsClient } from './client'

/**
 * The replay recorder on iOS and Android: the native plugin behind the
 * `posthog-react-native` client, which screenshots the app's views. The web
 * build has no native layer, so it records through posthog-js instead
 * (`./recorder.web`). Both are driven only from `./replay`.
 */

export function startRecorder(): Promise<void> {
  return analyticsClient()?.startSessionRecording() ?? Promise.resolve()
}

export function stopRecorder(): Promise<void> {
  return analyticsClient()?.stopSessionRecording() ?? Promise.resolve()
}

/**
 * Hides its children from session replay. For what would tie a recording to a
 * person — an email address — or is a secret, like a password or an API key.
 */
export function ReplayMask({ children }: { children: ReactNode }) {
  return <PostHogMaskView>{children}</PostHogMaskView>
}
