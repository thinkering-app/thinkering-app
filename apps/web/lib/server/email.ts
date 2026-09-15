import { getDeps } from './deps'

/**
 * The one way content leaves these routes (docs/02 §Feedback): a Resend email
 * to feedback@thinkering.app. Nothing is stored or logged — the dev path
 * without a key logs the shape only, never the message.
 */

export const FEEDBACK_ADDRESS = 'feedback@thinkering.app'

export type SendResult = { ok: true } | { ok: false; status: number; error: string }

export async function sendFeedbackEmail(input: {
  subject: string
  text: string
  replyTo?: string
  /** Log line label, so a failure is traceable without its content. */
  at: string
}): Promise<SendResult> {
  const { fetch: doFetch } = getDeps()
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Dev without Resend configured: accept, and log that it happened.
    console.log(JSON.stringify({ at: input.at, dev: true, chars: input.text.length }))
    return { ok: true }
  }

  const res = await doFetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `thinkering <${FEEDBACK_ADDRESS}>`,
      to: [FEEDBACK_ADDRESS],
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  })
  if (!res.ok) {
    console.log(JSON.stringify({ at: input.at, status: res.status, error: 'send_failed' }))
    return { ok: false, status: 502, error: 'send_failed' }
  }
  return { ok: true }
}

/** Shared by both channels: the coarse context line, or nothing when it was withheld. */
export function contextLine(context?: { screen: string; platform: string; appVersion: string }): string {
  return context ? `${context.screen} · ${context.platform} ${context.appVersion}` : 'no app details'
}
