import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * Session storage for Supabase auth. The refresh token is a long-lived
 * credential, so it belongs in the keychain alongside the device secret and the
 * BYO key (docs/02 §Security) — but SecureStore rejects values over ~2 KB and a
 * session is comfortably larger, so values are split across numbered chunks.
 * Web has no SecureStore and falls back to localStorage, as elsewhere.
 */

const CHUNK_SIZE = 1536

function countKey(key: string): string {
  return `${key}.chunks`
}

async function get(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  }
  const count = Number(await SecureStore.getItemAsync(countKey(key)))
  if (!Number.isInteger(count) || count <= 0) return null
  const parts: string[] = []
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(`${key}.${i}`)
    if (part === null) return null
    parts.push(part)
  }
  return parts.join('')
}

async function set(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return
  }
  await remove(key)
  const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE))
  for (let i = 0; i < count; i += 1) {
    await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
  }
  await SecureStore.setItemAsync(countKey(key), String(count))
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return
  }
  const count = Number(await SecureStore.getItemAsync(countKey(key)))
  if (Number.isInteger(count)) {
    for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(`${key}.${i}`)
  }
  await SecureStore.deleteItemAsync(countKey(key))
}

export const sessionStorage = {
  getItem: get,
  setItem: set,
  removeItem: remove,
}
