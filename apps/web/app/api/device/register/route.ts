import { z } from 'zod'
import { newDeviceCredentials } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { utcDayOf } from '@/lib/server/metering'

const bodySchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
})

/**
 * Each device gets its own daily budget, so minting devices is minting budget.
 * A real install registers once, and again only after its data is cleared;
 * the headroom is for many people behind one address (carrier NAT, an office).
 */
export const REGISTRATIONS_PER_IP_PER_DAY = 20

/** First-launch device registration (D10): issues {deviceId, secret} for SecureStore. */
export async function POST(req: Request): Promise<Response> {
  const { store, now } = getDeps()

  // The first x-forwarded-for hop is the client as far as the platform is concerned.
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0]!.trim()
  if ((await store.countIpAction(ip, utcDayOf(now()), 'register')) > REGISTRATIONS_PER_IP_PER_DAY) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  let parsed
  try {
    parsed = bodySchema.safeParse(await req.json())
  } catch {
    parsed = bodySchema.safeParse(undefined)
  }
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }

  const { deviceId, secret } = newDeviceCredentials()
  await store.createDevice({
    deviceId,
    secret,
    platform: parsed.data.platform,
    createdAt: now(),
    attested: false,
  })
  return Response.json({ deviceId, secret })
}
