/**
 * Password gate for the internal pages under /internal (docs/02 §Internal
 * pages). Each page is its own area with its own password, so access to one
 * can be handed out without handing out the other; `INTERNAL_PASSWORD` is the
 * fallback for an area that has no password of its own, so setting just that
 * one opens both. Passwords are server-side only, never shipped to a client.
 *
 * A correct password mints a signed, expiring, HttpOnly cookie per area that
 * `middleware.ts` checks before the page is allowed to render.
 *
 * Web Crypto rather than node:crypto: the same code has to run in the Edge
 * middleware and in the login server action, and it is the only API both have.
 */

export const INTERNAL_AREAS = ['prompts', 'library'] as const
export type InternalArea = (typeof INTERNAL_AREAS)[number]

export const AREA_LABELS: Record<InternalArea, string> = {
  prompts: 'Prompts',
  library: 'Library',
}

/** An area's own password; falling back to the shared one when it has none. */
const AREA_ENV: Record<InternalArea, string> = {
  prompts: 'INTERNAL_PASSWORD_PROMPTS',
  library: 'INTERNAL_PASSWORD_LIBRARY',
}

/** Long enough to read through a page, short enough that a stray laptop expires. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/** Cookies are scoped to /internal, so they are never sent with anything else. */
export const COOKIE_PATH = '/internal'

export function cookieFor(area: InternalArea): string {
  return `thinkering_internal_${area}`
}

/** `/internal/prompts` and anything under it is the prompts area. */
export function areaOf(pathname: string): InternalArea | undefined {
  return INTERNAL_AREAS.find(
    (area) => pathname === `/internal/${area}` || pathname.startsWith(`/internal/${area}/`),
  )
}

async function hmacHex(keyBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The cookie signing key, derived from the area's password and named with the
 * area — so two areas sharing a password still can't accept each other's
 * cookies. Rotating a password signs everyone out of that area, and only that
 * area, which is the behaviour you want from rotating it.
 */
async function signingKey(area: InternalArea, password: string): Promise<Uint8Array> {
  const hex = await hmacHex(
    new TextEncoder().encode(password),
    `thinkering-internal-session-v1:${area}`,
  )
  return Uint8Array.from(hex.match(/../g)!.map((pair) => parseInt(pair, 16)))
}

/** The gate is closed, not open, when nothing is configured. */
export function areaPassword(area: InternalArea): string | undefined {
  const own = process.env[AREA_ENV[area]]
  const password = own && own.length > 0 ? own : process.env.INTERNAL_PASSWORD
  return password && password.length > 0 ? password : undefined
}

/**
 * Constant-time equality: comparing HMACs of the two strings under a key the
 * caller doesn't know leaks neither length nor prefix through timing.
 */
async function equals(a: string, b: string): Promise<boolean> {
  const nonce = crypto.getRandomValues(new Uint8Array(32))
  const [ha, hb] = await Promise.all([hmacHex(nonce, a), hmacHex(nonce, b)])
  return ha === hb
}

/**
 * Every area this password opens — usually one, or both when they share a
 * password. One form field can then unlock whatever it is entitled to.
 */
export async function areasFor(candidate: string): Promise<InternalArea[]> {
  const checks = await Promise.all(
    INTERNAL_AREAS.map(async (area) => {
      const password = areaPassword(area)
      return password && (await equals(candidate, password)) ? area : undefined
    }),
  )
  return checks.filter((area): area is InternalArea => area !== undefined)
}

/** `<expiresAt>.<hmac>` — the cookie carries its own expiry so the check is stateless. */
export async function createSessionToken(
  area: InternalArea,
  now: number,
): Promise<string | undefined> {
  const password = areaPassword(area)
  if (!password) return undefined
  const expiresAt = now + SESSION_TTL_MS
  const signature = await hmacHex(await signingKey(area, password), String(expiresAt))
  return `${expiresAt}.${signature}`
}

export async function verifySessionToken(
  area: InternalArea,
  token: string | undefined,
  now: number,
): Promise<boolean> {
  const password = areaPassword(area)
  if (!password || !token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expiresAt = Number(token.slice(0, dot))
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false
  const expected = await hmacHex(await signingKey(area, password), String(expiresAt))
  return equals(token.slice(dot + 1), expected)
}
