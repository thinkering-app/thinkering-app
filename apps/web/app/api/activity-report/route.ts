import { z } from 'zod'
import {
  activityDocSchema,
  docForReport,
  FEEDBACK_PLATFORMS,
  FEEDBACK_SCREENS,
  RATINGS,
  sanitizeFeedbackContext,
  TIERS,
} from '@thinkering/core'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { contextLine, sendEmail } from '@/lib/server/email'
import { utcDayOf } from '@/lib/server/metering'

/**
 * An activity the user chose to share with us (D18, docs/08). It carries the
 * generated activity and their rating and note — never their answers, and never
 * the questions they asked, which the client strips and this route strips again.
 * Forwarded by email and never stored; nothing arrives here without that
 * explicit action.
 */

/** Generous enough for a long activity document, small enough to bound an email. */
const MAX_REPORT_BYTES = 80_000
const RATE_LIMIT_PER_DAY = 5

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  libraryItemId: z.string().min(1).max(80),
  tier: z.enum(TIERS),
  rating: z.enum(RATINGS).nullish(),
  comment: z.string().max(4000).nullish(),
  doc: activityDocSchema,
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
  if (new Blob([bodyText]).size > MAX_REPORT_BYTES) {
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
  if ((await store.countDeviceAction(auth.deviceId, day, 'activity_report')) > RATE_LIMIT_PER_DAY) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  const report = body.data
  const context = report.context ? sanitizeFeedbackContext(report.context) : undefined
  const sent = await sendEmail({
    at: 'activity_report',
    subject: `Shared activity · ${report.libraryItemId} · ${report.tier}`,
    text: [
      `Title: ${report.title}`,
      `Library item: ${report.libraryItemId} (${report.tier})`,
      `Rating: ${report.rating ?? 'none'}${report.comment ? ` — ${report.comment}` : ''}`,
      `Context: ${contextLine(context)}`,
      '',
      '--- activity ---',
      JSON.stringify(docForReport(report.doc), null, 2),
    ].join('\n'),
  })
  if (!sent.ok) return Response.json({ error: sent.error }, { status: sent.status })
  return Response.json({ ok: true })
}
