import { NextResponse, type NextRequest } from 'next/server'
import {
  areaOf,
  cookieFor,
  INTERNAL_AREAS,
  verifySessionToken,
  type InternalArea,
} from './lib/server/internal-auth'

/**
 * CORS for the device-facing API routes (docs/02 §Clients). The Expo web export
 * is deployed to its own origin (`web.thinkering.app`), so every call it makes
 * to `/api/*` here is cross-origin: without these headers the browser rejects
 * the preflight and the app never reaches the proxy at all. Native clients
 * don't preflight and are unaffected.
 *
 * The allowlist is explicit — these routes are signed per device, but the
 * browser is the only caller that gets to skip the signature on a preflight,
 * so there is no reason to answer for origins we don't ship.
 */

const CONFIGURED_ORIGINS = (process.env.WEB_APP_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const ALLOWED_ORIGINS = new Set(['https://web.thinkering.app', ...CONFIGURED_ORIGINS])

/** `expo start --web` and a local `expo export -p web` preview. */
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

/**
 * The headers `signedHeaders()` in apps/mobile/src/ai/device.ts sends. Every
 * one has to be listed: a header the browser asks for and doesn't find here
 * fails the preflight, which takes the whole web app offline — so this has to
 * be updated in the same change that adds one (cors.test.ts pins them).
 */
const REQUEST_HEADERS = 'content-type, x-device-id, x-timestamp, x-signature, x-app-version'

function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true
  return process.env.NODE_ENV !== 'production' && LOCALHOST.test(origin)
}

export const LOGIN_PATH = '/internal/login'

function unlocked(req: NextRequest, area: InternalArea): Promise<boolean> {
  return verifySessionToken(area, req.cookies.get(cookieFor(area))?.value, Date.now())
}

/**
 * The gate for the internal pages (docs/02 §Internal pages). It runs before a
 * page is rendered at all, so an unauthenticated visitor never reaches the
 * server component — every page also re-checks, so neither layer is the only
 * thing standing between a password and the content.
 *
 * Each page is its own area with its own password. The index is a signpost
 * rather than content, so any one unlocked area is enough to see it.
 */
async function internal(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl
  if (pathname === LOGIN_PATH) return NextResponse.next()

  const area = areaOf(pathname)
  const allowed = area
    ? await unlocked(req, area)
    : (await Promise.all(INTERNAL_AREAS.map((a) => unlocked(req, a)))).some(Boolean)
  if (allowed) return NextResponse.next()

  const login = new URL(LOGIN_PATH, req.url)
  login.searchParams.set('next', pathname)
  const res = NextResponse.redirect(login)
  // A stale or tampered cookie is worth clearing so the next request is clean.
  for (const a of INTERNAL_AREAS) {
    if (req.cookies.has(cookieFor(a)) && !(await unlocked(req, a))) res.cookies.delete(cookieFor(a))
  }
  return res
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  if (req.nextUrl.pathname.startsWith('/internal')) return internal(req)

  const origin = req.headers.get('origin')

  if (!origin || !isAllowed(origin)) {
    // Same-origin (the landing page's own contact form) or an origin we don't
    // ship: no CORS headers, and a preflight that gets none simply fails.
    return NextResponse.next()
  }

  const cors = {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': REQUEST_HEADERS,
    'access-control-max-age': '86400',
    vary: 'Origin',
  }

  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: cors })

  const res = NextResponse.next()
  for (const [key, value] of Object.entries(cors)) res.headers.set(key, value)
  return res
}

export const config = { matcher: ['/api/:path*', '/internal/:path*'] }
