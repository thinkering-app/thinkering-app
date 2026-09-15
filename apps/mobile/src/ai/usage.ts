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

export async function fetchUsage(): Promise<UsageSnapshot> {
  const res = await fetch(`${API_BASE_URL}/api/usage`, {
    method: 'GET',
    headers: await signedHeaders(''),
  })
  if (!res.ok) throw new Error(`usage unavailable (${res.status})`)
  return (await res.json()) as UsageSnapshot
}
