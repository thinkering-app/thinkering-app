import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import {
  budgetHeaders,
  deviceLimit,
  nextUtcMidnight,
  utcDayOf,
  weightedUsed,
} from '@/lib/server/metering'

/** Me → AI usage meter. Signed GET (empty body in the signature). */
export async function GET(req: Request): Promise<Response> {
  const { store, now } = getDeps()
  const auth = await verifyDeviceAuth(req, '', store, now())
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status })

  const [usage, bonusWeighted] = await Promise.all([
    store.getUsage(auth.deviceId, utcDayOf(now())),
    store.getBonus(auth.deviceId),
  ])
  // The limit the app shows is this device's, so a redeemed code needs no
  // arithmetic on the client — the meter just reads fuller.
  const limit = deviceLimit(bonusWeighted)
  const used = weightedUsed(usage)
  return Response.json(
    {
      day: utcDayOf(now()),
      limit,
      used: Math.min(used, limit),
      remaining: Math.max(0, limit - used),
      calls: usage.calls,
      granted: bonusWeighted,
      resetAt: nextUtcMidnight(now()),
    },
    { headers: budgetHeaders(usage, now(), bonusWeighted) },
  )
}
