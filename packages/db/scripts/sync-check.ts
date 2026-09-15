/**
 * `pnpm sync:check` — the live half of M8's sync, which no unit test can reach:
 * two simulated devices exchanging rows through a real Supabase project, with
 * RLS in the path.
 *
 * Needs the network and a project, so it is deliberately a script and not a
 * test — `pnpm verify` must never touch either (docs/10). Reads
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY from the
 * environment (`apps/web/.env` carries the first two).
 *
 * It creates two throwaway confirmed users, exercises push/pull/LWW/tombstones/
 * RLS/the schema-version floor, and deletes both users at the end. Nothing it
 * writes outlives the run.
 */
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { applyPull, collectPush, SCHEMA_VERSION, type SyncPayload } from '../src/backup'
import type { Database } from '../src/database'
import * as schema from '../src/schema'
import { interests } from '../src/schema'

const url = required('SUPABASE_URL')
const anonKey = required('SUPABASE_ANON_KEY')
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
const migrationsFolder = join(import.meta.dirname, '../migrations')

let failures = 0
const createdUsers: string[] = []

async function main() {
  const alice = await signedInClient('alice')
  const bob = await signedInClient('bob')

  // ── device A: a fresh path, pushed up ────────────────────────────────────
  const a = openDevice()
  const id = seedInterest(a, 'Conversational German', 1_000)
  const first = collectPush(a, 0)
  await push(alice, first.push)
  check('first sync pushes every row', first.push.length === 1, `${first.push.length} rows`)

  // ── device B: the same account on a second device, empty, pulls it down ──
  const b = openDevice()
  const pulled = await pull(alice, 0)
  const applied = applyPull(b, pulled, 0)
  check(
    'a second device pulls the path down',
    applied.ok && applied.applied === 1 && nameOf(b, id) === 'Conversational German',
    JSON.stringify(applied),
  )

  // ── concurrent edit: the later write wins on both devices ────────────────
  rename(a, id, 'Renamed on A', 2_000)
  rename(b, id, 'Renamed on B', 3_000)
  await push(alice, collectPush(a, 1_000).push)
  await push(alice, collectPush(b, 1_000).push)

  const backToA = applyPull(a, await pull(alice, 1_000), 1_000)
  check(
    'the later of two concurrent edits wins',
    backToA.ok && nameOf(a, id) === 'Renamed on B',
    nameOf(a, id),
  )

  // ── tombstone: a delete travels and is not resurrected ───────────────────
  softDelete(a, id, 4_000)
  await push(alice, collectPush(a, 3_000).push)
  applyPull(b, await pull(alice, 3_000), 3_000)
  check('a tombstone travels', deletedAtOf(b, id) === 4_000, String(deletedAtOf(b, id)))

  // ── RLS: nobody else can see or touch it ─────────────────────────────────
  const intruder = await pull(bob, 0)
  check("another account sees none of it", intruder.length === 0, `${intruder.length} rows`)

  // ── D17: the server refuses a build older than the floor ─────────────────
  const stale = await bob.client.from('sync_rows').insert({
    user_id: bob.id,
    table_name: 'interests',
    id: 'floor-probe',
    updated_at: 1,
    deleted_at: null,
    schema_version: 0,
    data: {},
  })
  check('the schema_version floor rejects an out-of-date build', stale.error !== null, 'accepted it')

  // ── turning backup off removes the server copy ───────────────────────────
  const { error: deleteError } = await alice.client.from('sync_rows').delete().eq('user_id', alice.id)
  const left = await pull(alice, 0)
  check(
    'turning backup off deletes the server copy',
    deleteError === null && left.length === 0,
    `${deleteError?.message ?? ''} ${left.length} rows left`,
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

interface Signed {
  id: string
  client: SupabaseClient
}

async function signedInClient(label: string): Promise<Signed> {
  const email = `sync-check+${label}-${Date.now()}@thinkering.app`
  const password = `check-${Math.random().toString(36).slice(2)}-${Date.now()}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`could not create the ${label} test user: ${error?.message}`)
  createdUsers.push(data.user.id)

  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`could not sign ${label} in: ${signInError.message}`)
  return { id: data.user.id, client }
}

async function push(who: Signed, payloads: SyncPayload[]): Promise<void> {
  if (payloads.length === 0) return
  const { error } = await who.client.from('sync_rows').upsert(
    payloads.map((p) => ({
      user_id: who.id,
      table_name: p.table,
      id: p.id,
      updated_at: p.updatedAt,
      deleted_at: p.deletedAt,
      schema_version: p.schemaVersion,
      data: p.data,
    })),
    { onConflict: 'user_id,table_name,id' },
  )
  if (error) throw new Error(`push failed: ${error.message}`)
}

async function pull(who: Signed, since: number): Promise<unknown[]> {
  const { data, error } = await who.client
    .from('sync_rows')
    .select('table_name, id, updated_at, deleted_at, schema_version, data')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
  if (error) throw new Error(`pull failed: ${error.message}`)
  return data.map((row) => ({
    table: row.table_name,
    id: row.id,
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
    schemaVersion: row.schema_version,
    data: row.data,
  }))
}

function openDevice(): Database {
  const sqlite = new BetterSqlite3(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })
  return db as unknown as Database
}

function seedInterest(db: Database, name: string, at: number): string {
  const id = 'i-sync-check'
  db.insert(interests)
    .values({
      id,
      name,
      wantToLearn: 'Hold a dinner conversation',
      whyChoice: 'personal_goal',
      experienceChoice: 'explored',
      frequency: 'daily',
      sessionMinutes: 10,
      status: 'focus',
      sortOrder: 1,
      createdAt: at,
      updatedAt: at,
    })
    .run()
  return id
}

const rename = (db: Database, id: string, name: string, at: number) =>
  db.update(interests).set({ name, updatedAt: at }).where(eq(interests.id, id)).run()

const softDelete = (db: Database, id: string, at: number) =>
  db.update(interests).set({ deletedAt: at, updatedAt: at }).where(eq(interests.id, id)).run()

const nameOf = (db: Database, id: string) =>
  db.select().from(interests).where(eq(interests.id, id)).get()?.name

const deletedAtOf = (db: Database, id: string) =>
  db.select().from(interests).where(eq(interests.id, id)).get()?.deletedAt

function check(what: string, passed: boolean, detail = ''): void {
  if (passed) {
    console.log(`  ok   ${what}`)
  } else {
    failures += 1
    console.log(`  FAIL ${what}${detail ? ` — ${detail}` : ''}`)
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (value) return value
  console.error(
    `${name} is not set. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY live in apps/web/.env;\n` +
      'SUPABASE_ANON_KEY is the project\'s publishable key, from Project Settings → API.\n' +
      'Run as: set -a && . ./apps/web/.env && set +a && SUPABASE_ANON_KEY=… pnpm sync:check',
  )
  process.exit(1)
}

console.log(`sync check against ${url} (schema version ${SCHEMA_VERSION})`)
try {
  await main()
} catch (error) {
  failures += 1
  console.log(`  FAIL ${error instanceof Error ? error.message : String(error)}`)
} finally {
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id)
}
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
