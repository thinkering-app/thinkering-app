import { fetch } from 'expo/fetch'
import type { ActivityDoc, FeedbackContext, Rating, Tier } from '@thinkering/core'

import { signedHeaders } from '@/ai/device'
import { API_BASE_URL } from '@/ai/settings'

/**
 * The two private channels (docs/02 §Feedback): a message the user typed, and
 * an activity they chose to share (D18). Both are signed device requests that
 * the server forwards by email and never stores. Community feedback doesn't
 * pass through here at all — it goes straight to the Featurebase portal.
 */

export interface ActivityReport {
  title: string
  libraryItemId: string
  tier: Tier
  rating?: Rating | null
  comment?: string | null
  doc: ActivityDoc
}

async function post(path: string, payload: unknown): Promise<void> {
  const body = JSON.stringify(payload)
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: await signedHeaders(body),
    body,
  })
  if (!res.ok) throw new Error(`${path} failed (${res.status})`)
}

export async function postFeedback(input: {
  message: string
  /** Reply-To only; never stored on the device (docs/01 §2). */
  replyEmail?: string
  /** Omitted entirely when the user turns "Include app details" off. */
  context?: FeedbackContext
}): Promise<void> {
  await post('/api/feedback', {
    message: input.message,
    ...(input.replyEmail ? { replyEmail: input.replyEmail } : {}),
    ...(input.context ? { context: input.context } : {}),
  })
}

export async function postActivityReport(
  report: ActivityReport,
  context?: FeedbackContext,
): Promise<void> {
  await post('/api/activity-report', { ...report, ...(context ? { context } : {}) })
}
