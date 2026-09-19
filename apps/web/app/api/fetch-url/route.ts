import { z } from 'zod'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import {
  checkBudget,
  nextUtcMidnight,
  reverseDelta,
  utcDayOf,
  withoutDelta,
} from '@/lib/server/metering'
import { fetchPage } from '@/lib/server/page-fetch'
import type { UsageDelta } from '@/lib/server/store'

/**
 * Page fetch for add-by-link (docs/01 §5): the client sends a URL, this returns
 * the page's title and readable text for G10 to describe. Device-authed like
 * every other route, and the URL guards live in `page-fetch`.
 */

export const maxDuration = 30

const bodySchema = z.object({ url: z.string().min(1).max(2000) })

export async function POST(req: Request): Promise<Response> {
  const { store, now, fetch: doFetch } = getDeps()

  const bodyText = await req.text()
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

  // Not a model call, but it makes the server fetch a URL of the caller's
  // choosing, so it takes the same per-kind daily ceiling. Counted first and
  // checked after, like /api/ai, so parallel requests can't all slip under it.
  const day = utcDayOf(now())
  const call: UsageDelta = { counters: ['fetch.url'], calls: 1, inputTokens: 0, outputTokens: 0 }
  const before = withoutDelta(await store.addUsage(auth.deviceId, day, call), call)
  if (!checkBudget('fetch.url', before.device).allowed) {
    await store.addUsage(auth.deviceId, day, reverseDelta(call))
    return Response.json(
      { error: 'kind_limit_reached', resetAt: nextUtcMidnight(now()) },
      { status: 429 },
    )
  }

  const page = await fetchPage(body.data.url.trim(), doFetch)
  if (!page.ok) {
    // Blocked is the learner's URL being unusable, not a server fault.
    return Response.json({ error: page.reason }, { status: page.reason === 'blocked' ? 400 : 422 })
  }
  return Response.json({ url: page.url, title: page.title, text: page.text })
}
