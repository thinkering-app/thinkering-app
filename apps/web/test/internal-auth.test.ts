import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  areasFor,
  areaPasswords,
  cookieFor,
  createSessionToken,
  safeNext,
  SESSION_TTL_MS,
  verifySessionToken,
} from '@/lib/server/internal-auth'
import { resetLoginAttemptsForTests, tooManyAttempts } from '@/lib/server/login-attempts'
import { middleware } from '@/middleware'

/**
 * The internal pages are only as private as this gate, so the cases that would
 * quietly open them are the ones worth pinning: nothing configured, a forged
 * or expired cookie, a cookie minted under the previous password — and, now
 * that each page has its own password, one page's cookie opening the other.
 * The master password is the other side of that: it has to open both pages
 * without weakening any of the above.
 */

const PROMPTS_PW = 'correct horse battery staple'
const LIBRARY_PW = 'a different password entirely'
const MASTER_PW = 'the one that opens everything'
const NOW = 1_800_000_000_000

function page(path: string, cookies: Partial<Record<string, string>> = {}): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
  return new NextRequest(`https://www.thinkering.app${path}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

beforeEach(() => {
  process.env.INTERNAL_PASSWORD_PROMPTS = PROMPTS_PW
  process.env.INTERNAL_PASSWORD_LIBRARY = LIBRARY_PW
})

afterEach(() => {
  delete process.env.INTERNAL_PASSWORD
  delete process.env.INTERNAL_PASSWORD_PROMPTS
  delete process.env.INTERNAL_PASSWORD_LIBRARY
})

describe('per-area passwords', () => {
  it('opens only the area whose password was given', async () => {
    expect(await areasFor(PROMPTS_PW)).toEqual(['prompts'])
    expect(await areasFor(LIBRARY_PW)).toEqual(['library'])
    expect(await areasFor('neither')).toEqual([])
  })

  it('opens both when it is the only password set', async () => {
    delete process.env.INTERNAL_PASSWORD_PROMPTS
    delete process.env.INTERNAL_PASSWORD_LIBRARY
    process.env.INTERNAL_PASSWORD = MASTER_PW
    expect(await areasFor(MASTER_PW)).toEqual(['prompts', 'library'])
  })

  it('opens both alongside the passwords the pages set for themselves', async () => {
    process.env.INTERNAL_PASSWORD = MASTER_PW
    expect(areaPasswords('prompts')).toEqual([PROMPTS_PW, MASTER_PW])
    // Each page keeps its own password, and the master opens them all.
    expect(await areasFor(PROMPTS_PW)).toEqual(['prompts'])
    expect(await areasFor(LIBRARY_PW)).toEqual(['library'])
    expect(await areasFor(MASTER_PW)).toEqual(['prompts', 'library'])
  })

  it('is one key, not two, for a page whose own password is the master', async () => {
    process.env.INTERNAL_PASSWORD = PROMPTS_PW
    expect(areaPasswords('prompts')).toEqual([PROMPTS_PW])
  })

  it('stays closed when nothing is configured', async () => {
    delete process.env.INTERNAL_PASSWORD_PROMPTS
    delete process.env.INTERNAL_PASSWORD_LIBRARY
    expect(areaPasswords('prompts')).toEqual([])
    expect(await createSessionToken('prompts', PROMPTS_PW, NOW)).toBeUndefined()
    expect(await areasFor('')).toEqual([])
    expect(await verifySessionToken('prompts', 'anything', NOW)).toBe(false)
  })

  it('will not mint a token for a password that does not open the area', async () => {
    expect(await createSessionToken('prompts', LIBRARY_PW, NOW)).toBeUndefined()
  })
})

describe('internal session tokens', () => {
  it('accepts a token it just minted and rejects one that has expired', async () => {
    const token = await createSessionToken('prompts', PROMPTS_PW, NOW)
    expect(await verifySessionToken('prompts', token, NOW)).toBe(true)
    expect(await verifySessionToken('prompts', token, NOW + SESSION_TTL_MS + 1)).toBe(false)
  })

  it('rejects a tampered expiry or signature', async () => {
    const token = (await createSessionToken('prompts', PROMPTS_PW, NOW))!
    const [expiresAt, signature] = token.split('.')
    expect(
      await verifySessionToken('prompts', `${Number(expiresAt) + 1_000}.${signature}`, NOW),
    ).toBe(false)
    expect(await verifySessionToken('prompts', `${expiresAt}.${'0'.repeat(64)}`, NOW)).toBe(false)
    expect(await verifySessionToken('prompts', 'not-a-token', NOW)).toBe(false)
  })

  it('will not accept one area’s token for the other, even on a shared password', async () => {
    process.env.INTERNAL_PASSWORD_LIBRARY = PROMPTS_PW
    const token = await createSessionToken('prompts', PROMPTS_PW, NOW)
    expect(await verifySessionToken('prompts', token, NOW)).toBe(true)
    expect(await verifySessionToken('library', token, NOW)).toBe(false)
  })

  it('rotating one password leaves the other area signed in', async () => {
    const prompts = await createSessionToken('prompts', PROMPTS_PW, NOW)
    const library = await createSessionToken('library', LIBRARY_PW, NOW)
    process.env.INTERNAL_PASSWORD_PROMPTS = 'rotated'
    expect(await verifySessionToken('prompts', prompts, NOW)).toBe(false)
    expect(await verifySessionToken('library', library, NOW)).toBe(true)
  })

  it('signs out only the password that was rotated, not the other one', async () => {
    process.env.INTERNAL_PASSWORD = MASTER_PW
    const onOwn = await createSessionToken('prompts', PROMPTS_PW, NOW)
    const onMaster = await createSessionToken('prompts', MASTER_PW, NOW)
    expect(await verifySessionToken('prompts', onOwn, NOW)).toBe(true)
    expect(await verifySessionToken('prompts', onMaster, NOW)).toBe(true)
    // Rotating the master is for master-holders; it is not a lockout of the page.
    process.env.INTERNAL_PASSWORD = 'rotated'
    expect(await verifySessionToken('prompts', onMaster, NOW)).toBe(false)
    expect(await verifySessionToken('prompts', onOwn, NOW)).toBe(true)
  })

  it('will not accept one area’s master cookie for the other', async () => {
    process.env.INTERNAL_PASSWORD = MASTER_PW
    const token = await createSessionToken('prompts', MASTER_PW, NOW)
    expect(await verifySessionToken('library', token, NOW)).toBe(false)
  })
})

describe('internal middleware gate', () => {
  it('redirects to the login page without a valid session', async () => {
    const res = await middleware(page('/internal/prompts'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/internal/login')
    expect(location.searchParams.get('next')).toBe('/internal/prompts')
  })

  it('lets each area through only on its own cookie', async () => {
    const token = (await createSessionToken('prompts', PROMPTS_PW, Date.now()))!
    const jar = { [cookieFor('prompts')]: token }
    expect((await middleware(page('/internal/prompts', jar))).headers.get('location')).toBeNull()
    // The same cookie is no help on the page it does not cover.
    const blocked = await middleware(page('/internal/library', jar))
    expect(new URL(blocked.headers.get('location')!).pathname).toBe('/internal/login')
    // The index is a signpost, so one unlocked area is enough to see it.
    expect((await middleware(page('/internal', jar))).headers.get('location')).toBeNull()
  })

  it('always lets the login page through, and turns a forged cookie away', async () => {
    expect((await middleware(page('/internal/login'))).headers.get('location')).toBeNull()
    const forged = { [cookieFor('library')]: `${Date.now() + 1000}.${'a'.repeat(64)}` }
    const res = await middleware(page('/internal/library', forged))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/internal/login')
  })
})

describe('where sign-in sends you next', () => {
  it('only ever lands inside the internal area', () => {
    expect(safeNext('/internal/prompts')).toBe('/internal/prompts')
    // An off-site URL would turn the login page into an open redirect.
    expect(safeNext('https://attacker.example')).toBe('/internal')
    expect(safeNext('//attacker.example')).toBe('/internal')
    expect(safeNext('/internal-evil')).toBe('/internal')
    // A duplicated ?next= arrives as an array, not a string.
    expect(safeNext(['/internal/prompts', '/internal/library'])).toBe('/internal')
    expect(safeNext(undefined)).toBe('/internal')
    // Bouncing back to the login page would be a loop.
    expect(safeNext('/internal/login')).toBe('/internal')
  })
})

describe('sign-in attempt cap', () => {
  it('cuts an IP off after ten tries and lets it back in the next window', () => {
    resetLoginAttemptsForTests()
    for (let i = 0; i < 10; i += 1) expect(tooManyAttempts('1.2.3.4', NOW)).toBe(false)
    expect(tooManyAttempts('1.2.3.4', NOW)).toBe(true)
    // Another address is unaffected, and the window eventually reopens.
    expect(tooManyAttempts('5.6.7.8', NOW)).toBe(false)
    expect(tooManyAttempts('1.2.3.4', NOW + 16 * 60 * 1000)).toBe(false)
  })
})
