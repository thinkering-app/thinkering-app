import { createHmac, randomBytes } from 'node:crypto'

/**
 * Codes that grant extra daily budget (docs/04 §Usage metering). A code is a
 * bearer secret: only its HMAC under the server key is stored, so a leaked
 * table grants nothing and there is nothing to read back out of it.
 *
 * The alphabet is Crockford base32 without the letters that get misread on a
 * phone screen, and normalisation is case-insensitive and ignores the dashes,
 * so a code can be typed the way it was written down.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const GROUPS = 3
const GROUP_LENGTH = 4

export function newBudgetCode(): string {
  const bytes = randomBytes(GROUPS * GROUP_LENGTH)
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length])
  return Array.from({ length: GROUPS }, (_, i) =>
    chars.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH).join(''),
  ).join('-')
}

/** What gets hashed: the code as typed, minus formatting and case. */
export function normalizeBudgetCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

export function hashBudgetCode(secretKey: string, code: string): string {
  return createHmac('sha256', secretKey)
    .update(`code.${normalizeBudgetCode(code)}`)
    .digest('hex')
}
