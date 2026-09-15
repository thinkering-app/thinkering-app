import type { AuthError, Session } from '@supabase/supabase-js'

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
  const { data } = supabase().auth.onAuthStateChange((_event, session) => listener(toAccount(session)))
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

const UNREACHABLE = "We couldn't reach the server. Check your connection and try again."

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
    return { ok: false, message: UNREACHABLE }
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
  if (error.name === 'AuthRetryableFetchError') return UNREACHABLE
  switch (error.code) {
    case 'invalid_credentials':
      return "That email and password don't match."
    case 'email_not_confirmed':
      return 'Check your email for the confirmation link, then sign in.'
    case 'user_already_exists':
      return 'There is already an account with that email. Sign in instead.'
    case 'weak_password':
      return 'Use a longer password — at least eight characters.'
    case 'over_email_send_rate_limit':
      return 'Too many attempts just now. Try again in a few minutes.'
    default:
      return error.message
  }
}
