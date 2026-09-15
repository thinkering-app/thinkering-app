import { Platform } from 'react-native'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { sessionStorage } from './storage'

/**
 * The Supabase client backup & sync run on (docs/02 §Backup & sync). The app
 * talks to Supabase directly with the anon key — RLS on `sync_rows` is what
 * keeps a user to their own rows, and no user learning data passes through our
 * API routes.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/** False in builds with no Supabase project configured; backup hides itself. */
export const backupConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase is not configured in this build')
  client ??= createClient(url, anonKey, {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Native has no URL to read a session out of; the web build is a plain
      // email/password form, not an OAuth redirect.
      detectSessionInUrl: Platform.OS === 'web',
    },
  })
  return client
}
