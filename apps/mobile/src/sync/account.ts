import type { AuthError, Session } from '@supabase/supabase-js'

import { fetch } from 'expo/fetch'

import { signedHeaders } from '@/ai/device'
import { API_BASE_URL } from '@/ai/settings'
import { t } from '@/i18n'
import { backupConfigured, supabase } from './supabase'

/**
 * Supabase email/password auth (docs/02). Enabling backup is what creates or
 * links the account; there is no account anywhere else in the app.
 */

export interface Account {
  id: string
  email: string
}

export type AuthResult = { ok: true } | { ok: false; message: string }

export async function currentAccount(): Promise<Account | null> {
  if (!backupConfigured) return null
  const { data } = await supabase().auth.getSession()
  return toAccount(data.session)
}

/** Fires on sign-in, sign-out and token refresh. Returns an unsubscribe. */
export function onAccountChange(listener: (account: Account | null) => void): () => void {
  if (!backupConfigured) return () => {}
  const { data } = supabase().auth.onAuthStateChange((_event, session) =>
    listener(toAccount(session)),
  )
  return () => data.subscription.unsubscribe()
}

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  return attempt(() => supabase().auth.signUp({ email: email.trim(), password }))
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  return attempt(() => supabase().auth.signInWithPassword({ email: email.trim(), password }))
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut()
}

export async function changePassword(password: string): Promise<AuthResult> {
  return attempt(() => supabase().auth.updateUser({ password }))
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  return attempt(() => supabase().auth.resetPasswordForEmail(email.trim()))
}

/**
 * Deletes the account itself, not just its data (App Review 5.1.1(v)). Only the
 * server can do it — deleting a user needs the secret key — so the session's
 * access token goes to `POST /api/account/delete`, which deletes exactly the
 * account that token belongs to. The rows go with it (`on delete cascade`).
 */
export async function deleteAccount(): Promise<AuthResult> {
  if (!backupConfigured) return { ok: false, message: UNREACHABLE() }
  try {
    const { data } = await supabase().auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false, message: t('me.account.signInAgainToDelete') }
    const res = await fetch(`${API_BASE_URL}/api/account/delete`, {
      method: 'POST',
      headers: { ...(await signedHeaders('')), authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { ok: false, message: t('me.account.deleteFailed') }
    await supabase().auth.signOut()
    return { ok: true }
  } catch {
    return { ok: false, message: UNREACHABLE() }
  }
}

const UNREACHABLE = () => t('me.account.unreachable')

/**
 * Supabase reports most failures as a returned `error`, but a dead network
 * rejects instead — with a message about Swift promises that means nothing to a
 * learner. Either way the caller gets something to show; a silent button is the
 * one outcome a sign-in screen must never have.
 */
async function attempt(call: () => Promise<{ error: AuthError | null }>): Promise<AuthResult> {
  try {
    const { error } = await call()
    return error ? { ok: false, message: authMessage(error) } : { ok: true }
  } catch {
    return { ok: false, message: UNREACHABLE() }
  }
}

function toAccount(session: Session | null): Account | null {
  if (!session?.user.email) return null
  return { id: session.user.id, email: session.user.email }
}

/**
 * Supabase's messages are developer-facing; these are the ones a learner can act
 * on. Anything unexpected keeps its original text rather than being flattened
 * into "something went wrong" — a real message is more useful than a polite one.
 */
function authMessage(error: AuthError): string {
  if (error.name === 'AuthRetryableFetchError') return UNREACHABLE()
  switch (error.code) {
    case 'invalid_credentials':
      return t('me.account.invalidCredentials')
    case 'email_not_confirmed':
      return t('me.account.confirmEmailFirst')
    case 'user_already_exists':
      return t('me.account.alreadyExists')
    case 'weak_password':
      return t('me.account.weakPassword')
    case 'over_email_send_rate_limit':
      return t('me.account.rateLimited')
    default:
      return error.message
  }
}
