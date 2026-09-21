/**
 * Password gate for the internal pages under /internal (docs/02 §Internal
 * pages). Each page is its own area with its own password, so access to one
 * can be handed out without handing out the other; `INTERNAL_PASSWORD` is the
 * master, opening every area alongside whatever password that area sets for
 * itself. Passwords are server-side only, never shipped to a client.
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

/** An area's own password, for handing out one page without the other. */
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

/**
 * Only ever bounce back into the internal area — never an attacker's URL, and
 * never the login page itself. A duplicated `?next=` arrives as an array, so
 * anything that isn't a string lands on `/internal` too.
 */
export function safeNext(next: unknown): string {
  return typeof next === 'string' &&
    /^\/internal(\/|$)/.test(next) &&
    !next.startsWith('/internal/login')
    ? next
    : '/internal'
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
 * The cookie signing key, derived from the password that opened the area and
 * named with the area — so two areas sharing a password still can't accept
 * each other's cookies. A session is signed with the one password it was let
 * in on, so rotating a password signs out exactly the people who used it:
 * rotating the master leaves anyone holding a page's own password alone, and
 * vice versa, which is the behaviour you want from rotating one of them.
 */
async function signingKey(area: InternalArea, password: string): Promise<Uint8Array> {
  const hex = await hmacHex(
    new TextEncoder().encode(password),
    `thinkering-internal-session-v1:${area}`,
  )
  return Uint8Array.from(hex.match(/../g)!.map((pair) => parseInt(pair, 16)))
}

/**
 * Every password that opens an area: its own and the master, either of which
 * may be unset — and when both are, the area is closed, not open. Deduplicated
 * so an area whose own password *is* the master is still just one key.
 */
export function areaPasswords(area: InternalArea): string[] {
  const configured = [process.env[AREA_ENV[area]], process.env.INTERNAL_PASSWORD]
  return [...new Set(configured.filter((p): p is string => !!p && p.length > 0))]
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

/** Whether a password is one of the ones that open an area. */
async function opens(area: InternalArea, candidate: string): Promise<boolean> {
  const matches = await Promise.all(areaPasswords(area).map((p) => equals(candidate, p)))
  return matches.some(Boolean)
}

/**
 * Every area this password opens — one for a page's own password, all of them
 * for the master. One form field can then unlock whatever it is entitled to.
 */
export async function areasFor(candidate: string): Promise<InternalArea[]> {
  const checks = await Promise.all(
    INTERNAL_AREAS.map(async (area) => ((await opens(area, candidate)) ? area : undefined)),
  )
  return checks.filter((area): area is InternalArea => area !== undefined)
}

/** `<expiresAt>.<hmac>` — the cookie carries its own expiry so the check is stateless. */
export async function createSessionToken(
  area: InternalArea,
  password: string,
  now: number,
): Promise<string | undefined> {
  if (!(await opens(area, password))) return undefined
  const expiresAt = now + SESSION_TTL_MS
  const signature = await hmacHex(await signingKey(area, password), String(expiresAt))
  return `${expiresAt}.${signature}`
}

/** A session stands if it was signed by any password that still opens the area. */
export async function verifySessionToken(
  area: InternalArea,
  token: string | undefined,
  now: number,
): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expiresAt = Number(token.slice(0, dot))
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false
  const signature = token.slice(dot + 1)
  const matches = await Promise.all(
    areaPasswords(area).map(async (password) =>
      equals(signature, await hmacHex(await signingKey(area, password), String(expiresAt))),
    ),
  )
  return matches.some(Boolean)
}
