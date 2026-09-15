import { fetch } from 'expo/fetch'
import { signedHeaders } from './device'
import { API_BASE_URL } from './settings'

/** Me → AI usage (docs/02 §Device identity): today's metered usage from the proxy. */

export interface UsageSnapshot {
  day: string
  /** Weighted tokens (docs/04): output counts four times input. */
  limit: number
  used: number
  remaining: number
  calls: number
  /** ISO instant the daily budget resets (UTC midnight). */
  resetAt: string
}

/** A meter nobody can reach should say so rather than spin (no proxy, no network). */
const TIMEOUT_MS = 8_000

export async function fetchUsage(): Promise<UsageSnapshot> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}/api/usage`, {
      method: 'GET',
      headers: await signedHeaders(''),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`usage unavailable (${res.status})`)
    return (await res.json()) as UsageSnapshot
  } finally {
    clearTimeout(timer)
  }
}
