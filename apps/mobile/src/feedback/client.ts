import { Platform } from 'react-native'
import Constants from 'expo-constants'
import type { ActivityDoc, Rating } from '@thinkering/core'

import { API_BASE_URL } from '@/ai/settings'
import { getDeviceCredentials } from '@/ai/device'

/**
 * The feedback route (docs/02 §Feedback, docs/08 D18): plain feedback, and the
 * explicit per-activity share. Nothing here goes out without a user action —
 * and a shared report carries the generated activity, never the user's own
 * answers unless they asked for those too.
 */

export interface ActivityReport {
  title: string
  libraryItemId: string
  tier: string
  rating?: Rating | null
  comment?: string | null
  doc: ActivityDoc
  /** Opt-in within the opt-in (D18): off unless the user ticks the box. */
  responses?: { prompt: string; answer: string }[]
}

export async function postFeedback(input: {
  message: string
  screen: string
  activityReport?: ActivityReport
}): Promise<void> {
  const { deviceId } = await getDeviceCredentials()
  const res = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-id': deviceId },
    body: JSON.stringify({
      message: input.message,
      context: {
        screen: input.screen,
        appVersion: Constants.expoConfig?.version ?? '0.0.0',
        platform: Platform.OS,
      },
      ...(input.activityReport ? { activityReport: JSON.stringify(input.activityReport) } : {}),
    }),
  })
  if (!res.ok) throw new Error(`feedback failed (${res.status})`)
}
