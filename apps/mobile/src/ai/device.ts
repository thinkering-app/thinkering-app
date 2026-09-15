import { fetch } from 'expo/fetch'
import { Platform } from 'react-native'
import { hmacSha256Hex } from './hmac'
import { KEYS, secureGet, secureSet } from './secure-store'
import { API_BASE_URL } from './settings'

/** Device token lifecycle (D10): register on first proxy use, sign every request. */

export interface DeviceCredentials {
  deviceId: string
  secret: string
}

let cached: DeviceCredentials | null = null

export async function getDeviceCredentials(): Promise<DeviceCredentials> {
  if (cached) return cached
  const [deviceId, secret] = await Promise.all([secureGet(KEYS.deviceId), secureGet(KEYS.deviceSecret)])
  if (deviceId && secret) {
    cached = { deviceId, secret }
    return cached
  }

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'
  const res = await fetch(`${API_BASE_URL}/api/device/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ platform }),
  })
  if (!res.ok) throw new Error(`device registration failed (${res.status})`)
  const creds = (await res.json()) as DeviceCredentials
  await Promise.all([secureSet(KEYS.deviceId, creds.deviceId), secureSet(KEYS.deviceSecret, creds.secret)])
  cached = creds
  return creds
}

export async function signedHeaders(body: string): Promise<Record<string, string>> {
  const { deviceId, secret } = await getDeviceCredentials()
  const timestamp = Date.now()
  const signature = await hmacSha256Hex(secret, `${deviceId}.${timestamp}.${body}`)
  return {
    'content-type': 'application/json',
    'x-device-id': deviceId,
    'x-timestamp': String(timestamp),
    'x-signature': signature,
  }
}
