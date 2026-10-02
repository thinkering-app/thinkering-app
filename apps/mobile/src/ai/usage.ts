import { fetch } from 'expo/fetch'
import { t } from '@/i18n'
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
  /** Extra daily budget from a redeemed code, already included in `limit`. */
  granted: number
  /** ISO instant the daily budget resets (UTC midnight). */
  resetAt: string
}

/** A code was not accepted — unknown, expired or already used, indistinguishably. */
export class CodeError extends Error {}

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

/**
 * Redeems a code for extra daily budget (docs/04 §Usage metering). Returns the
 * device's new daily limit, which the meter then reads against.
 */
export async function redeemCode(code: string): Promise<{ granted: number; limit: number }> {
  const body = JSON.stringify({ code })
  const res = await fetch(`${API_BASE_URL}/api/device/redeem`, {
    method: 'POST',
    headers: await signedHeaders(body),
    body,
  })
  if (res.status === 404) throw new CodeError(t('me.ai.codeRejected'))
  if (res.status === 429) throw new CodeError(t('me.ai.codeTooManyTries'))
  if (!res.ok) throw new CodeError(t('me.ai.codeUnreachable'))
  return (await res.json()) as { granted: number; limit: number }
}
