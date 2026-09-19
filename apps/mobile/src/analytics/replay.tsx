import { useEffect, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { PostHogMaskView } from 'posthog-react-native'
import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'
import { analyticsClient, isAnalyticsConfigured } from './client'

/**
 * Session replay (docs/08): a separate opt-in from anonymous usage, default
 * off. The client is built with `enableSessionReplay: false`, so nothing is
 * recorded unless this setting is on — the recorder is started by hand, on
 * launch and when the learner turns it on, and stopped when they turn it off.
 * Recording needs the native plugin, so it's iOS and Android only.
 */

const REPLAY_KEY = 'posthog_replay_opt_in'

/** Whether this build can record at all: a PostHog key, and not the web export. */
export function isReplayAvailable(): boolean {
  return isAnalyticsConfigured() && Platform.OS !== 'web'
}

export function isReplayOptedIn(): boolean {
  return getSetting<boolean>(db, REPLAY_KEY) ?? false
}

export function setReplayConsent(optedIn: boolean): void {
  setSetting(db, REPLAY_KEY, optedIn)
  if (optedIn) startRecording()
  else stopRecording()
}

/** Resumes recording on launch for a learner who opted in. Waits for the schema, like `useAppOpened`. */
export function useSessionReplay(ready: boolean): void {
  useEffect(() => {
    if (ready && isReplayOptedIn()) startRecording()
  }, [ready])
}

/**
 * Hides its children from session replay. For what would tie a recording to a
 * person — an email address — or is a secret, like an API key.
 */
export function ReplayMask({ children }: { children: ReactNode }) {
  return <PostHogMaskView>{children}</PostHogMaskView>
}

function startRecording(): void {
  if (!isReplayAvailable()) return
  try {
    void analyticsClient()
      ?.startSessionRecording()
      .catch(() => {})
  } catch {
    // Replay is never worth an exception on a user's screen.
  }
}

function stopRecording(): void {
  if (!isReplayAvailable()) return
  try {
    void analyticsClient()
      ?.stopSessionRecording()
      .catch(() => {})
  } catch {
    // As above.
  }
}
