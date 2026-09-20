import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { MeteringStore } from './store'

/**
 * Device identity (D10): server-issued device token. Requests carry
 * `x-device-id`, `x-timestamp` (epoch ms) and `x-signature` =
 * HMAC-SHA256(secret, `${deviceId}.${timestamp}.${bodyText}`), hex.
 * Timestamps outside the window and repeated signatures are rejected.
 */

export const REPLAY_WINDOW_MS = 5 * 60 * 1000

// Best-effort per-instance replay cache. Serverless instances each keep their
// own; the timestamp window bounds exposure. App Attest is the later hardening.
const seenSignatures = new Map<string, number>()

export function newDeviceCredentials(): { deviceId: string; secret: string } {
  return { deviceId: randomUUID(), secret: randomBytes(32).toString('hex') }
}

export function signRequest(
  secret: string,
  deviceId: string,
  timestamp: number,
  body: string,
): string {
  return createHmac('sha256', secret).update(`${deviceId}.${timestamp}.${body}`).digest('hex')
}

export type AuthResult =
  { ok: true; deviceId: string } | { ok: false; status: number; message: string }

export async function verifyDeviceAuth(
  req: Request,
  body: string,
  store: MeteringStore,
  now: number = Date.now(),
): Promise<AuthResult> {
  const deviceId = req.headers.get('x-device-id')
  const timestampRaw = req.headers.get('x-timestamp')
  const signature = req.headers.get('x-signature')
  if (!deviceId || !timestampRaw || !signature) {
    return { ok: false, status: 401, message: 'missing device auth headers' }
  }

  const timestamp = Number(timestampRaw)
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > REPLAY_WINDOW_MS) {
    return { ok: false, status: 401, message: 'stale or invalid timestamp' }
  }

  const device = await store.getDevice(deviceId)
  if (!device) return { ok: false, status: 401, message: 'unknown device' }

  const expected = signRequest(device.secret, deviceId, timestamp, body)
  const a = Buffer.from(signature, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: 'bad signature' }
  }

  for (const [sig, expiry] of seenSignatures) {
    if (expiry < now) seenSignatures.delete(sig)
  }
  if (seenSignatures.has(signature)) {
    return { ok: false, status: 401, message: 'replayed request' }
  }
  seenSignatures.set(signature, now + REPLAY_WINDOW_MS)

  return { ok: true, deviceId }
}

/** Test hook: the replay cache is per-module-instance state. */
export function resetReplayCacheForTests(): void {
  seenSignatures.clear()
}
