import { isIP } from 'node:net'

/**
 * Fetching a page the learner pasted (docs/01 §5 add-by-link, G10). The server
 * does it rather than the app so the app isn't parsing arbitrary HTML — and
 * because the same fetch must be safe when someone points it at our own
 * network. Hence the guards below; they are the point of this module.
 */

export const MAX_BYTES = 2_000_000
export const MAX_TEXT_CHARS = 8_000
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 10_000

export type FetchPageResult =
  | { ok: true; url: string; title?: string; text: string }
  | { ok: false; reason: 'blocked' | 'unreachable' | 'unreadable' }

/**
 * Rejects anything that isn't a plain public http(s) URL: other schemes,
 * credentials in the URL, non-default-ish ports, and hostnames that resolve to
 * our own network (SSRF). Literal private IPs are rejected outright; names are
 * checked again per redirect hop.
 */
export function isPublicHttpUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  if (url.port && !['80', '443', '8080', ''].includes(url.port)) return false
  return !isPrivateHost(url.hostname)
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa'))
    return true
  // A bare name with no dot is something on the local network, not the web.
  if (!host.includes('.') && isIP(host) === 0) return true

  const version = isIP(host)
  if (version === 4) {
    const [a, b] = host.split('.').map(Number) as [number, number]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // link-local, incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    return false
  }
  if (version === 6) {
    if (host === '::1' || host === '::') return true
    if (host.startsWith('fc') || host.startsWith('fd')) return true // unique-local
    if (host.startsWith('fe80')) return true // link-local
    // IPv4-mapped addresses hide a v4 address inside a v6 literal, and URL
    // normalises ::ffff:127.0.0.1 to its hex form (::ffff:7f00:1).
    const dotted = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    if (dotted) return isPrivateHost(dotted[1]!)
    const hex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
    if (hex) {
      const high = parseInt(hex[1]!, 16)
      const low = parseInt(hex[2]!, 16)
      return isPrivateHost([high >> 8, high & 0xff, low >> 8, low & 0xff].join('.'))
    }
    return false
  }
  return false
}

/** Fetches a page and reduces it to title + readable text. */
export async function fetchPage(url: string, doFetch: typeof fetch): Promise<FetchPageResult> {
  if (!isPublicHttpUrl(url)) return { ok: false, reason: 'blocked' }

  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await doFetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { accept: 'text/html,text/plain;q=0.9', 'user-agent': 'thinkering-link-preview' },
      })
    } catch {
      return { ok: false, reason: 'unreachable' }
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return { ok: false, reason: 'unreachable' }
      const next = new URL(location, current).toString()
      // Every hop is re-checked: a public URL is free to redirect inward.
      if (!isPublicHttpUrl(next)) return { ok: false, reason: 'blocked' }
      current = next
      continue
    }
    if (!res.ok) return { ok: false, reason: 'unreachable' }

    const contentType = res.headers.get('content-type') ?? ''
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return { ok: false, reason: 'unreadable' }
    }
    const html = await readCapped(res)
    const text = readableText(html)
    if (text.length === 0) return { ok: false, reason: 'unreadable' }
    return { ok: true, url: current, title: pageTitle(html), text }
  }
  return { ok: false, reason: 'unreachable' }
}

/** Reads at most MAX_BYTES so a huge or endless response can't take the function down. */
async function readCapped(res: Response): Promise<string> {
  if (!res.body) return await res.text()
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let out = ''
  let bytes = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    out += decoder.decode(value, { stream: true })
    if (bytes >= MAX_BYTES) {
      await reader.cancel()
      break
    }
  }
  return out
}

export function pageTitle(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  const title = match ? decodeEntities(match[1]!).trim() : ''
  return title.length > 0 ? title.slice(0, 200) : undefined
}

/** Tags out, entities decoded, whitespace collapsed, truncated. Not a reader-mode parser. */
export function readableText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(stripped)
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS)
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16))
    }
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)))
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
      mdash: '—',
      ndash: '–',
      hellip: '…',
      rsquo: '’',
      lsquo: '‘',
      ldquo: '“',
      rdquo: '”',
    }
    return named[entity.toLowerCase()] ?? whole
  })
}
