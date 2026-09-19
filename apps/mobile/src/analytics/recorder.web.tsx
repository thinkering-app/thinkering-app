import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'
import type { PostHog } from 'posthog-js/dist/module.full.no-external'
import { analyticsClient, POSTHOG_HOST, POSTHOG_KEY } from './client'
import { releaseChannel } from './release-channel'

/**
 * The replay recorder on web. `posthog-react-native` can't record a browser,
 * so this loads posthog-js — only once someone has opted in, as its own chunk
 * — and uses it for recording and nothing else: events still go through
 * `track()`. The `no-external` build carries the recorder with it, because the
 * app is served cross-origin isolated (COEP `require-corp`) and PostHog's
 * usual lazy script from its CDN would be blocked.
 */

/** What `ReplayMask` marks; posthog-js blocks it from the recording. */
const MASK_ATTRIBUTE = 'data-replay-mask'

let recorder: Promise<PostHog | null> | null = null

export async function startRecorder(): Promise<void> {
  recorder ??= load()
  const posthog = await recorder
  posthog?.startSessionRecording()
}

export async function stopRecorder(): Promise<void> {
  // Never loaded means never recording — nothing to stop, nothing to download.
  const posthog = await recorder
  posthog?.stopSessionRecording()
}

async function load(): Promise<PostHog | null> {
  // The same anonymous id as the events, so a recording and a learner's usage line up.
  const distinctID = analyticsClient()?.getDistinctId()
  if (!distinctID) return null
  const { default: posthog } = await import('posthog-js/dist/module.full.no-external')
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    bootstrap: { distinctID, isIdentifiedID: false },
    // Kept in memory: no cookie and nothing new in the browser's storage.
    persistence: 'memory',
    disable_external_dependency_loading: true,
    // Started by hand from `./replay`, never at init.
    disable_session_recording: true,
    session_recording: {
      // The opt-in copy says we can see what you type; masked fields are blocked instead.
      maskAllInputs: false,
      blockSelector: `[${MASK_ATTRIBUTE}]`,
    },
    enable_recording_console_log: false,
    capture_performance: false,
    // Everything ambient is off, as on the native client (docs/08).
    autocapture: false,
    rageclick: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_feature_flags: true,
    save_referrer: false,
    person_profiles: 'never',
    // And if anything slipped past the above, it isn't sent: this client only
    // ever carries recordings.
    before_send: (event) => (event?.event === '$snapshot' ? event : null),
  })
  // Kept in memory like the rest, so it's set on every load.
  posthog.register({ release_channel: releaseChannel() })
  return posthog
}

/** Hides its children from session replay — see `./recorder` for what gets wrapped. */
export function ReplayMask({ children }: { children: ReactNode }) {
  // react-native-web renders `dataSet` as data-* attributes; the native types don't know it.
  const props = { dataSet: { replayMask: '' } } as ViewProps
  return <View {...props}>{children}</View>
}
