import { NextResponse, type NextRequest } from 'next/server'

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

/** The headers `signedHeaders()` in apps/mobile/src/ai/device.ts sends. */
const REQUEST_HEADERS = 'content-type, x-device-id, x-timestamp, x-signature'

function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true
  return process.env.NODE_ENV !== 'production' && LOCALHOST.test(origin)
}

export function middleware(req: NextRequest): NextResponse {
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

export const config = { matcher: '/api/:path*' }
