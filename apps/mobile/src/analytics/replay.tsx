import { useEffect } from 'react'
import { getSetting, setSetting } from '@thinkering/db'
import { db } from '@/db'
import { isAnalyticsConfigured } from './client'
import { startRecorder, stopRecorder } from './recorder'

export { ReplayMask } from './recorder'

/**
 * Session replay (docs/08): a separate opt-in from anonymous usage, default
 * off. The client is built with `enableSessionReplay: false`, so nothing is
 * recorded unless this setting is on — the recorder is started by hand, on
 * launch and when the learner turns it on, and stopped when they turn it off.
 * The recorder itself is per platform: the native plugin on iOS and Android,
 * posthog-js on web (`./recorder`, `./recorder.web`).
 */

const REPLAY_KEY = 'posthog_replay_opt_in'
const DECIDED_KEY = 'posthog_replay_decided'

/** Whether this build can record at all — the same PostHog key as analytics. */
export function isReplayAvailable(): boolean {
  return isAnalyticsConfigured()
}

export function isReplayOptedIn(): boolean {
  return getSetting<boolean>(db, REPLAY_KEY) ?? false
}

/** Whether the welcome screen's replay ask still has to happen. */
export function isReplayUndecided(): boolean {
  return !(getSetting<boolean>(db, DECIDED_KEY) ?? false)
}

export function setReplayConsent(optedIn: boolean): void {
  setSetting(db, REPLAY_KEY, optedIn)
  setSetting(db, DECIDED_KEY, true)
  if (optedIn) startRecording()
  else stopRecording()
}

/** Resumes recording on launch for a learner who opted in. Waits for the schema, like `useAppOpened`. */
export function useSessionReplay(ready: boolean): void {
  useEffect(() => {
    if (ready && isReplayOptedIn()) startRecording()
  }, [ready])
}

function startRecording(): void {
  if (!isReplayAvailable()) return
  try {
    startRecorder().catch(() => {})
  } catch {
    // Replay is never worth an exception on a user's screen.
  }
}

function stopRecording(): void {
  if (!isReplayAvailable()) return
  try {
    stopRecorder().catch(() => {})
  } catch {
    // As above.
  }
}
