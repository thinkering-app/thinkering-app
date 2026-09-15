import { getRandomValues } from 'expo-crypto'

/**
 * Hermes has no global `crypto`, and expo-crypto ships the implementation
 * without installing one. Ids are UUIDv7 from `crypto.getRandomValues`
 * (docs/03), so this runs before anything can mint one — importing it from
 * `@/db` guarantees that, since every write goes through that module.
 */
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, getRandomValues },
    configurable: true,
    writable: true,
  })
}
