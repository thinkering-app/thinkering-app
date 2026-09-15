import { z } from 'zod'
import { getDeps } from '@/lib/server/deps'

/**
 * Feedback → Resend → feedback@thinkering.app (docs/02 §Feedback). No auth
 * needed; lightly rate-limited per device id header. No learning data.
 */

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    screen: z.string().max(100),
    appVersion: z.string().max(50),
    platform: z.string().max(20),
  }),
})

const RATE_LIMIT_PER_DAY = 20
const sends = new Map<string, { day: string; count: number }>()

export async function POST(req: Request): Promise<Response> {
  const { fetch: doFetch, now } = getDeps()

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const body = bodySchema.safeParse(json)
  if (!body.success) {
    return Response.json({ error: 'invalid_request', issues: body.error.issues }, { status: 400 })
  }

  const deviceId = req.headers.get('x-device-id') ?? 'anonymous'
  const day = new Date(now()).toISOString().slice(0, 10)
  const entry = sends.get(deviceId)
  const count = entry && entry.day === day ? entry.count : 0
  if (count >= RATE_LIMIT_PER_DAY) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }
  sends.set(deviceId, { day, count: count + 1 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Dev without Resend configured: accept and log shape only.
    console.log(JSON.stringify({ at: 'feedback', dev: true, ...body.data.context }))
    return Response.json({ ok: true })
  }

  const res = await doFetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'thinkering <feedback@thinkering.app>',
      to: ['feedback@thinkering.app'],
      subject: `Feedback · ${body.data.context.screen} · ${body.data.context.platform} ${body.data.context.appVersion}`,
      text: body.data.message,
    }),
  })
  if (!res.ok) return Response.json({ error: 'send_failed' }, { status: 502 })
  return Response.json({ ok: true })
}
