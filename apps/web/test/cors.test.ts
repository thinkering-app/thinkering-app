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
  it('answers a preflight from the web app without hitting the route', () => {
    const res = middleware(request('OPTIONS', APP))
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(APP)
    expect(res.headers.get('access-control-allow-headers')).toContain('x-signature')
  })

  it('allows the web app origin on the real request', () => {
    const res = middleware(request('POST', APP))
    expect(res.headers.get('access-control-allow-origin')).toBe(APP)
    expect(res.headers.get('vary')).toBe('Origin')
  })

  it('stays silent for an unknown origin and for same-origin calls', () => {
    expect(
      middleware(request('POST', 'https://evil.example')).headers.get(
        'access-control-allow-origin',
      ),
    ).toBeNull()
    expect(middleware(request('POST')).headers.get('access-control-allow-origin')).toBeNull()
  })
})
