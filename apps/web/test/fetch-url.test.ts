import { beforeEach, describe, expect, it } from 'vitest'
import { POST as fetchUrlPost } from '@/app/api/fetch-url/route'
import { resetReplayCacheForTests } from '@/lib/server/auth'
import { BURST_LIMITS, utcDayOf } from '@/lib/server/metering'
import { isPublicHttpUrl, readableText } from '@/lib/server/page-fetch'
import { NOW, registerDevice, setupDeps, signedRequest } from './helpers'

/**
 * The page fetch behind add-by-link (docs/01 §5). The guards are the point:
 * this route makes the server fetch a URL the caller chose.
 */

beforeEach(() => resetReplayCacheForTests())

const PAGE = `<html><head><title>Nico&rsquo;s Weg &ndash; A1</title></head>
<body><script>var x = 1</script><h1>Nico's Weg</h1><p>A free German course from DW.</p></body></html>`

function htmlResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { headers: { 'content-type': 'text/html' }, ...init })
}

async function post(url: string, responses: Response[] = [htmlResponse(PAGE)]) {
  const queue = [...responses]
  const { store } = setupDeps({
    fetch: (async () => queue.shift() ?? htmlResponse(PAGE)) as typeof fetch,
  })
  const creds = await registerDevice(store)
  const body = JSON.stringify({ url })
  return fetchUrlPost(signedRequest('http://x/api/fetch-url', creds, { body }))
}

describe('isPublicHttpUrl', () => {
  it.each([
    'http://localhost:3000/x',
    'http://127.0.0.1/x',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.1.2.3/x',
    'http://192.168.0.1/x',
    'http://[::1]/x',
    'http://[::ffff:127.0.0.1]/x',
    'http://router/admin',
    'file:///etc/passwd',
    'https://user:pw@example.com/x',
    'https://example.com:22/x',
  ])('rejects %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(false)
  })

  it('accepts an ordinary public page', () => {
    expect(isPublicHttpUrl('https://www.dw.com/en/learn-german/nicos-weg/s-56841434')).toBe(true)
  })
})

describe('POST /api/fetch-url', () => {
  it('returns the title and readable text', async () => {
    const res = await post('https://example.com/course')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string; text: string }
    expect(body.title).toBe('Nico’s Weg – A1')
    expect(body.text).toContain('A free German course from DW.')
    expect(body.text).not.toContain('var x = 1')
  })

  it('refuses a URL pointed at our own network, before fetching', async () => {
    const res = await post('http://169.254.169.254/latest/meta-data/')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('blocked')
  })

  it('refuses a public URL that redirects inward', async () => {
    const redirect = new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1:8080/' },
    })
    const res = await post('https://example.com/go', [redirect])
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('blocked')
  })

  it('refuses a response that is not a page', async () => {
    const pdf = new Response('%PDF-1.4', { headers: { 'content-type': 'application/pdf' } })
    const res = await post('https://example.com/paper.pdf', [pdf])
    expect(res.status).toBe(422)
  })

  it('stops at the daily limit for the kind', async () => {
    const { store } = setupDeps({ fetch: (async () => htmlResponse(PAGE)) as typeof fetch })
    const creds = await registerDevice(store)
    const day = utcDayOf(NOW)
    for (let i = 0; i < BURST_LIMITS['fetch.url']!; i++) {
      await store.addUsage(creds.deviceId, day, {
        counters: ['fetch.url'],
        calls: 1,
        inputTokens: 0,
        outputTokens: 0,
      })
    }
    const body = JSON.stringify({ url: 'https://example.com/course' })
    const res = await fetchUrlPost(signedRequest('http://x/api/fetch-url', creds, { body }))
    expect(res.status).toBe(429)
  })
})

describe('readableText', () => {
  it('drops scripts and styles, decodes entities, and caps length', () => {
    const text = readableText(`<style>.a{}</style><p>One &amp; two</p><p>${'x'.repeat(20_000)}</p>`)
    expect(text.startsWith('One & two')).toBe(true)
    expect(text.length).toBeLessThanOrEqual(8_000)
  })
})
