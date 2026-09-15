import { createClient } from '@supabase/supabase-js'

/**
 * Account deletion against Supabase auth. The secret key is required — only
 * the `service_role` may call the admin API — and the user is identified from
 * their own access token, never from anything the client claims.
 */

export type DeleteAccountResult = { ok: true } | { ok: false; status: number; error: string }

export async function deleteSupabaseAccount(
  url: string | undefined,
  secretKey: string | undefined,
  accessToken: string,
): Promise<DeleteAccountResult> {
  if (!url || !secretKey) return { ok: false, status: 503, error: 'backup_not_configured' }

  const admin = createClient(url, secretKey, { auth: { persistSession: false } })

  // Validates the JWT and tells us whose it is, in one call.
  const { data, error } = await admin.auth.getUser(accessToken)
  if (error || !data.user) return { ok: false, status: 401, error: 'invalid_access_token' }

  const deleted = await admin.auth.admin.deleteUser(data.user.id)
  if (deleted.error) return { ok: false, status: 502, error: 'delete_failed' }
  return { ok: true }
}
