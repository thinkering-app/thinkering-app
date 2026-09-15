import { z } from 'zod'
import { newDeviceCredentials } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'

const bodySchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
})

/** First-launch device registration (D10): issues {deviceId, secret} for SecureStore. */
export async function POST(req: Request): Promise<Response> {
  const { store, now } = getDeps()

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
