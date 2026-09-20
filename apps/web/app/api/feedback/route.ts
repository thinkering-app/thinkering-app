import { z } from 'zod'
import { FEEDBACK_PLATFORMS, FEEDBACK_SCREENS, sanitizeFeedbackContext } from '@thinkering/core'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { contextLine, sendEmail } from '@/lib/server/email'
import { utcDayOf } from '@/lib/server/metering'

/**
 * Private feedback (docs/01 §2, docs/02 §Feedback): the user's message, an
 * optional reply address, and — only if they left "Include app details" on —
 * the three allowlisted context values. Forwarded by email, never stored.
 * Community feedback doesn't come through here; it goes to the Featurebase
 * portal, which this server never sees.
 */

const MAX_MESSAGE_CHARS = 4000
const RATE_LIMIT_PER_DAY = 20

const bodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  /** Reply-To only; never persisted anywhere (docs/08). */
  replyEmail: z.string().email().max(254).optional(),
  /** Absent when the user turned app details off. */
  context: z
    .object({
      screen: z.enum(FEEDBACK_SCREENS),
      platform: z.enum(FEEDBACK_PLATFORMS),
      appVersion: z.string().max(50),
    })
    .optional(),
})

export async function POST(req: Request): Promise<Response> {
  const { store, now } = getDeps()

  const bodyText = await req.text()
  // A bound on what we'll even parse; the real message limit is the schema's.
  // Generous, because JSON escaping inflates newline-heavy text.
  if (bodyText.length > 64_000) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }
  const auth = await verifyDeviceAuth(req, bodyText, store, now())
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status })

  let json: unknown
  try {
    json = JSON.parse(bodyText)
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const body = bodySchema.safeParse(json)
  if (!body.success) {
    return Response.json({ error: 'invalid_request', issues: body.error.issues }, { status: 400 })
  }

  const day = utcDayOf(now())
  if ((await store.countDeviceAction(auth.deviceId, day, 'feedback')) > RATE_LIMIT_PER_DAY) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  // Re-sanitized server-side: the allowlist can't depend on a client being honest.
  const context = body.data.context ? sanitizeFeedbackContext(body.data.context) : undefined
  const sent = await sendEmail({
    at: 'feedback',
    subject: `Feedback · ${contextLine(context)}`,
    text: body.data.message,
    replyTo: body.data.replyEmail,
  })
  if (!sent.ok) return Response.json({ error: sent.error }, { status: sent.status })
  return Response.json({ ok: true })
}
