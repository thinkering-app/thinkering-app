/**
 * Per-IP attempt cap for the internal sign-in. Best-effort like the contact
 * form's limiter, for the same reason — a serverless instance only sees its
 * own traffic — but enough that guessing at a real password is hopeless.
 */

const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

let attempts = new Map<string, { count: number; resetAt: number }>()

/** Counts this attempt and reports whether it is one too many. */
export function tooManyAttempts(ip: string, now: number): boolean {
  const current = attempts.get(ip)
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_ATTEMPTS
}

export function resetLoginAttemptsForTests(): void {
  attempts = new Map()
}
