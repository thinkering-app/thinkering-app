import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Keychain-backed storage for the device token and BYO key (D10). SecureStore
 * has no web implementation; web falls back to localStorage — the BYOK screen
 * warns about that (docs/02).
 */

export async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(`secure.${key}`)
  }
  return SecureStore.getItemAsync(key)
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(`secure.${key}`, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export const KEYS = {
  deviceId: 'thinkering.device_id',
  deviceSecret: 'thinkering.device_secret',
  byokKey: 'thinkering.byok_anthropic_key',
} as const
