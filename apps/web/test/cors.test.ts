import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

const APP = 'https://web.thinkering.app'

function request(method: string, origin?: string): NextRequest {
  return new NextRequest('https://www.thinkering.app/api/ai', {
    method,
    headers: origin ? { origin } : undefined,
  })
}

/**
 * The web export lives on its own origin, so a missing preflight answer takes
 * the whole app offline — silently, and only in the browser.
 */
describe('CORS middleware', () => {
  it('answers a preflight from the web app without hitting the route', async () => {
    const res = await middleware(request('OPTIONS', APP))
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(APP)
    expect(res.headers.get('access-control-allow-headers')).toContain('x-signature')
  })

  it('allows every header signedHeaders sends', async () => {
    // A header the client sends and this list omits fails the preflight, and
    // the web app goes offline with no error the server ever sees. Keep in
    // step with signedHeaders() in apps/mobile/src/ai/device.ts.
    const res = await middleware(request('OPTIONS', APP))
    const allowed = (res.headers.get('access-control-allow-headers') ?? '')
      .split(',')
      .map((h) => h.trim())
    expect(allowed).toEqual(
      expect.arrayContaining([
        'content-type',
        'x-device-id',
        'x-timestamp',
        'x-signature',
        'x-app-version',
      ]),
    )
  })

  it('allows the web app origin on the real request', async () => {
    const res = await middleware(request('POST', APP))
    expect(res.headers.get('access-control-allow-origin')).toBe(APP)
    expect(res.headers.get('vary')).toBe('Origin')
  })

  it('stays silent for an unknown origin and for same-origin calls', async () => {
    const unknown = await middleware(request('POST', 'https://evil.example'))
    expect(unknown.headers.get('access-control-allow-origin')).toBeNull()
    const sameOrigin = await middleware(request('POST'))
    expect(sameOrigin.headers.get('access-control-allow-origin')).toBeNull()
  })
})
