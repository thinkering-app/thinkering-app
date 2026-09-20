import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `device_actions.action` is a checked column, and the metering store in these
 * tests is in-memory — so a route counting an action the constraint doesn't
 * allow passes every test here and fails only against Postgres, in production,
 * on a route nobody exercises often. That is exactly how 'account_delete' shipped
 * missing. This reads both sides instead of restating either.
 */

const root = fileURLToPath(new URL('..', import.meta.url))

function routeSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return routeSources(path)
    return entry.name === 'route.ts' ? [readFileSync(path, 'utf8')] : []
  })
}

/** Every action the API routes count, read from the calls themselves. */
function actionsUsed(): string[] {
  const calls = routeSources(`${root}app/api`).flatMap((src) => [
    ...src.matchAll(/countDeviceAction\([^)]*?'([a-z_]+)'\s*\)/g),
  ])
  return [...new Set(calls.map((m) => m[1]!))].sort()
}

/** The actions the schema's check constraint permits. */
function actionsAllowed(): string[] {
  const schema = readFileSync(`${root}supabase/schema.sql`, 'utf8')
  // The re-runnable `alter table ... add constraint` is the authoritative list:
  // it is what an existing project ends up with.
  const clause = schema.match(
    /alter table device_actions add constraint device_actions_action_check\s*check \(action in \(([^)]*)\)\)/,
  )
  expect(clause, 'no device_actions check constraint in schema.sql').not.toBeNull()
  return [...clause![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).sort()
}

describe('device_actions constraint', () => {
  it('permits every action the routes actually count', () => {
    const used = actionsUsed()
    expect(used.length, 'found no countDeviceAction calls — has the API moved?').toBeGreaterThan(0)
    const allowed = actionsAllowed()
    expect(used.filter((action) => !allowed.includes(action))).toEqual([])
  })

  it('matches the constraint on the table definition', () => {
    const schema = readFileSync(`${root}supabase/schema.sql`, 'utf8')
    const inline = schema.match(/action text not null check \(\s*action in \(([^)]*)\)/)
    expect(inline, 'no inline check on device_actions').not.toBeNull()
    // A fresh project takes the inline list and an existing one the alter;
    // they drift apart silently if only one is edited.
    expect([...inline![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).sort()).toEqual(
      actionsAllowed(),
    )
  })
})
