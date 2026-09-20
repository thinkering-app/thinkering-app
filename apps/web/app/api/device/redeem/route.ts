import { z } from 'zod'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { deviceLimit, utcDayOf } from '@/lib/server/metering'

/**
 * Redeeming a code for extra daily budget (docs/04 §Usage metering). Signed
 * like every other device route. A code is redeemable once, by one device,
 * and grants a raised daily ceiling rather than a pool of tokens — so it fits
 * the per-day accounting the proxy already does.
 */

/**
 * Attempts per device per day, counted whether or not the code was good. A
 * code is guessable in a way a feedback message is not, so the attempts are
 * counted even though the route is authenticated: one device must not be able
 * to sweep the keyspace, in sequence or in parallel.
 */
export const REDEMPTIONS_PER_DEVICE_PER_DAY = 10

const bodySchema = z.object({ code: z.string().min(1).max(64) })

export async function POST(req: Request): Promise<Response> {
  const { store, now } = getDeps()

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
  if (!body.success) return Response.json({ error: 'invalid_request' }, { status: 400 })

  const day = utcDayOf(now())
  if (
    (await store.countDeviceAction(auth.deviceId, day, 'redeem')) > REDEMPTIONS_PER_DEVICE_PER_DAY
  ) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  const granted = await store.redeemCode(store.hashCode(body.data.code), auth.deviceId)
  // Unknown, expired and already-redeemed are one answer on purpose: telling
  // them apart would say which codes exist.
  if (granted === null) return Response.json({ error: 'invalid_code' }, { status: 404 })

  return Response.json({ granted, limit: deviceLimit(await store.getBonus(auth.deviceId)) })
}
