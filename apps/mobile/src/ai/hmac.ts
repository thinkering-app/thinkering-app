import * as Crypto from 'expo-crypto'

/**
 * HMAC-SHA256 over expo-crypto's digest (no HMAC primitive in the Expo
 * runtime). Must match the server's `createHmac('sha256', secret)` with the
 * secret's UTF-8 bytes as the key.
 */

const BLOCK = 64

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buffer = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  )
  return new Uint8Array(buffer)
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  let key: Uint8Array = encoder.encode(secret)
  if (key.length > BLOCK) key = await sha256(key)

  const ipad = new Uint8Array(BLOCK).fill(0x36)
  const opad = new Uint8Array(BLOCK).fill(0x5c)
  for (let i = 0; i < key.length; i++) {
    ipad[i]! ^= key[i]!
    opad[i]! ^= key[i]!
  }

  const inner = await sha256(concat(ipad, encoder.encode(message)))
  const outer = await sha256(concat(opad, inner))
  return Array.from(outer, (b) => b.toString(16).padStart(2, '0')).join('')
}
