/**
 * UUIDv7 (time-ordered) — ids are generated client-side (docs/03). Uses the
 * WinterCG `crypto.getRandomValues`, available in Node 22 and installed on
 * Hermes by the app's crypto polyfill (apps/mobile/src/crypto-polyfill.ts).
 *
 * Within one millisecond a 12-bit monotonic counter keeps ids sortable in
 * creation order; the counter seeds randomly and the remaining 62 bits are
 * random per id.
 */

let lastMs = -1
let counter = 0

export function uuidv7(nowMs?: number): string {
  const ms = nowMs ?? Date.now()
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)

  if (ms === lastMs) {
    counter = (counter + 1) & 0x0fff
  } else {
    lastMs = ms
    counter = rand[0]! & 0x07ff // seed below 2^11 so same-ms increments rarely wrap
  }

  const bytes = new Uint8Array(16)
  // 48-bit big-endian timestamp
  let t = ms
  for (let i = 5; i >= 0; i--) {
    bytes[i] = t % 256
    t = Math.floor(t / 256)
  }
  // version (7) + 12-bit counter
  bytes[6] = 0x70 | (counter >> 8)
  bytes[7] = counter & 0xff
  // variant (10) + 62 random bits
  bytes[8] = 0x80 | (rand[1]! & 0x3f)
  for (let i = 9; i < 16; i++) bytes[i] = rand[i - 7]!

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
