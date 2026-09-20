'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  areaOf,
  areasFor,
  cookieFor,
  COOKIE_PATH,
  createSessionToken,
  INTERNAL_AREAS,
  safeNext,
  SESSION_TTL_MS,
} from '@/lib/server/internal-auth'
import { tooManyAttempts } from '@/lib/server/login-attempts'

/** Sign in to and out of the internal pages (docs/02 §Internal pages). */

/** Failures come back as a search param, so the login page needs no client JS. */
function backToLogin(next: string, error: string): never {
  redirect(`/internal/login?next=${encodeURIComponent(next)}&error=${error}`)
}

/**
 * One password field unlocks every area that password opens — one when the two
 * pages have separate passwords, both when they share one. A password that
 * opens some other page than the one you asked for is still not a way in to
 * this one: you are sent to what it did unlock.
 */
export async function signIn(form: FormData): Promise<void> {
  const next = safeNext(form.get('next'))

  const ip = ((await headers()).get('x-forwarded-for') ?? 'unknown').split(',')[0]!.trim()
  if (tooManyAttempts(ip, Date.now())) backToLogin(next, 'rate')

  const granted = await areasFor(String(form.get('password') ?? ''))
  if (granted.length === 0) backToLogin(next, 'wrong')

  const jar = await cookies()
  for (const area of granted) {
    const token = await createSessionToken(area, Date.now())
    if (!token) continue
    jar.set(cookieFor(area), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: COOKIE_PATH,
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })
  }

  // Asked for a page this password doesn't open: land on what it did open.
  const wanted = areaOf(next)
  redirect(wanted && !granted.includes(wanted) ? `/internal/${granted[0]}` : next)
}

export async function signOut(): Promise<void> {
  const jar = await cookies()
  for (const area of INTERNAL_AREAS) jar.delete({ name: cookieFor(area), path: COOKIE_PATH })
  redirect('/internal/login')
}
