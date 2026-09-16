import * as Crypto from 'expo-crypto'

/**
 * HMAC-SHA256 over expo-crypto's digest (no HMAC primitive in the Expo
 * runtime). Must match the server's `createHmac('sha256', secret)` with the
 * secret's UTF-8 bytes as the key.
 */

const BLOCK = 64

/**
 * `Crypto.digest` is typed `BufferSource`, which a plain `Uint8Array` no longer
 * satisfies under TS 5.7+ — its buffer widened to `ArrayBufferLike`. Pinning
 * the buffer type is the fix; passing `.buffer` instead is not. The native
 * function expo-crypto falls back to on iOS takes a TypedArray and throws an
 * ArgumentCastException on a bare ArrayBuffer, and a throw here means the
 * signed request is never sent at all.
 */
type Bytes = Uint8Array<ArrayBuffer>

function concat(a: Bytes, b: Bytes): Bytes {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function utf8(text: string): Bytes {
  const bytes = new TextEncoder().encode(text)
  return new Uint8Array(bytes)
}

async function sha256(data: Bytes): Promise<Bytes> {
  const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data)
  return new Uint8Array(buffer)
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  let key = utf8(secret)
  if (key.length > BLOCK) key = await sha256(key)

  const ipad = new Uint8Array(BLOCK).fill(0x36)
  const opad = new Uint8Array(BLOCK).fill(0x5c)
  for (let i = 0; i < key.length; i++) {
    ipad[i]! ^= key[i]!
    opad[i]! ^= key[i]!
  }

  const inner = await sha256(concat(ipad, utf8(message)))
  const outer = await sha256(concat(opad, inner))
  return Array.from(outer, (b) => b.toString(16).padStart(2, '0')).join('')
}
