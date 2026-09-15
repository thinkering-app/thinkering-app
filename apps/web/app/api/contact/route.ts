import { z } from 'zod'
import { getDeps } from '@/lib/server/deps'
import { CONTACT_ADDRESS, sendEmail } from '@/lib/server/email'
import { utcDayOf } from '@/lib/server/metering'

/**
 * The landing page's contact form (docs/02 §Feedback) — the one unsigned email
 * route, because the sender is a visitor with no registered device. Forwarded
 * through Resend to contact@thinkering.app and never stored or logged.
 *
 * Abuse control is a honeypot field plus a per-IP daily cap held in memory.
 * Best-effort by design: a serverless instance only sees its own traffic, and
 * a durable counter would need a table keyed by something other than a device.
 */

const MAX_MESSAGE_CHARS = 4000
const RATE_LIMIT_PER_DAY = 5

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  /** Honeypot: hidden in the form, so anything here is a bot. */
  website: z.literal('').optional(),
})

let limits: { day: string; counts: Map<string, number> } = { day: '', counts: new Map() }

function overLimit(ip: string, day: string): boolean {
  if (limits.day !== day) limits = { day, counts: new Map() }
  const count = limits.counts.get(ip) ?? 0
  if (count >= RATE_LIMIT_PER_DAY) return true
  limits.counts.set(ip, count + 1)
  return false
}

export function resetContactLimitForTests(): void {
  limits = { day: '', counts: new Map() }
}

export async function POST(req: Request): Promise<Response> {
  const { now } = getDeps()

  const bodyText = await req.text()
  // A bound on what we'll even parse; the schema holds the real message limit.
  if (bodyText.length > 64_000) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }

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

  // The first x-forwarded-for hop is the client as far as the platform is concerned.
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0]!.trim()
  if (overLimit(ip, utcDayOf(now()))) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { name, email, message } = body.data
  const sent = await sendEmail({
    at: 'contact',
    to: CONTACT_ADDRESS,
    // Line breaks out of the subject: it is a header, not a body.
    subject: `Contact · ${name.replace(/\s+/g, ' ')}`,
    text: `${name} <${email}>\n\n${message}`,
    replyTo: email,
  })
  if (!sent.ok) return Response.json({ error: sent.error }, { status: sent.status })
  return Response.json({ ok: true })
}
