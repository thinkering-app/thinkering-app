import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import {
  budgetHeaders,
  DAILY_BUDGET_WEIGHTED,
  nextUtcMidnight,
  utcDayOf,
  weightedUsed,
} from '@/lib/server/metering'

/** Me → AI usage meter. Signed GET (empty body in the signature). */
export async function GET(req: Request): Promise<Response> {
  const { store, now } = getDeps()
  const auth = await verifyDeviceAuth(req, '', store, now())
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status })

  const usage = await store.getUsage(auth.deviceId, utcDayOf(now()))
  return Response.json(
    {
      day: utcDayOf(now()),
      limit: DAILY_BUDGET_WEIGHTED,
      used: Math.min(weightedUsed(usage), DAILY_BUDGET_WEIGHTED),
      remaining: Math.max(0, DAILY_BUDGET_WEIGHTED - weightedUsed(usage)),
      calls: usage.calls,
      resetAt: nextUtcMidnight(now()),
    },
    { headers: budgetHeaders(usage, now()) },
  )
}
