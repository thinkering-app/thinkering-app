import Anthropic from '@anthropic-ai/sdk'
import { deleteSupabaseAccount, type DeleteAccountResult } from './account'
import { MemoryStore, type MeteringStore } from './store'
import { SupabaseStore } from './supabase-store'

/**
 * Server dependencies with test injection. Production wiring comes from env:
 * ANTHROPIC_API_KEY (required for /api/ai), SUPABASE_URL + SUPABASE_SECRET_KEY
 * (metering; falls back to per-instance memory in dev), RESEND_API_KEY
 * (feedback).
 */

export interface ServerDeps {
  store: MeteringStore
  anthropic: () => Anthropic
  now: () => number
  fetch: typeof fetch
  /** Deletes the backup account an access token belongs to (docs/08). */
  deleteAccount: (accessToken: string) => Promise<DeleteAccountResult>
  /** Aggregate observability only — never receives prompt or response bodies. */
  logAiCall: (entry: {
    kind: string
    model: string
    status: 'ok' | 'error'
    inputTokens?: number
    outputTokens?: number
    latencyMs?: number
    errorType?: string
  }) => void
}

let deps: ServerDeps | undefined

function defaultDeps(): ServerDeps {
  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  return {
    store: url && secretKey ? new SupabaseStore(url, secretKey) : new MemoryStore(),
    anthropic: () => new Anthropic(),
    now: () => Date.now(),
    fetch: (...args) => fetch(...args),
    deleteAccount: (accessToken) => deleteSupabaseAccount(url, secretKey, accessToken),
    logAiCall: (entry) => console.log(JSON.stringify({ at: 'ai', ...entry })),
  }
}

export function getDeps(): ServerDeps {
  deps ??= defaultDeps()
  return deps
}

export function setDepsForTests(overrides: Partial<ServerDeps>): void {
  deps = { ...defaultDeps(), ...overrides }
}

export function resetDeps(): void {
  deps = undefined
}
