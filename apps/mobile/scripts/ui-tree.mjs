#!/usr/bin/env node
// Print what is addressable on the simulator screen right now: every node that
// carries a testID or text, with its bounds.
//
// This is how to find a handle before driving the app (docs/10 Tier 6). Reading
// the tree is the difference between "tap id: path-settings-save" and guessing a
// percentage off a screenshot — a guess that fails identically whether the
// element moved, the selector was wrong, or Metro never rebuilt.
//
// The app must be running on a booted simulator. `maestro hierarchy` restarts
// the XCUITest driver on every invocation, so expect ~40-60s per call.
//
// Usage: pnpm ui:tree [--raw] [--udid <udid>]
//        --raw   print the full hierarchy JSON instead of the table
//
// Env: JAVA_HOME (default /usr/local/opt/openjdk — Maestro needs a modern JDK)
//      MAESTRO_BIN (default ~/.maestro/bin/maestro)
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const raw = args.includes('--raw')
const udidIndex = args.indexOf('--udid')
let requestedUdid

if (udidIndex >= 0) {
  requestedUdid = args[udidIndex + 1]
  if (!requestedUdid || requestedUdid.startsWith('--')) {
    console.error('--udid needs a simulator UDID.')
    process.exit(1)
  }
}

const unknownArgs = args.filter(
  (arg, index) =>
    arg !== '--raw' && !(udidIndex >= 0 && (index === udidIndex || index === udidIndex + 1)),
)
if (unknownArgs.length > 0) {
  console.error(`Unknown argument: ${unknownArgs[0]}`)
  process.exit(1)
}

// Maestro counts every available device, not just the booted one, and bails with
// "Multiple devices connected" if it has to choose — so resolve the simulator
// here the same way seed-sim.sh does.
const udid =
  requestedUdid ??
  execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted'], { encoding: 'utf8' }).match(
    /\(([0-9A-F-]{36})\) \(Booted\)/,
  )?.[1]

if (!udid) {
  console.error('No booted simulator. Start the app first: .conductor/run-ios.sh')
  process.exit(1)
}

const maestro = process.env.MAESTRO_BIN ?? `${homedir()}/.maestro/bin/maestro`
const env = { ...process.env, JAVA_HOME: process.env.JAVA_HOME ?? '/usr/local/opt/openjdk' }

let out
try {
  out = execFileSync(maestro, ['--udid', udid, 'hierarchy'], {
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (err) {
  // Maestro's own message is the useful part — the JVM prints three unrelated
  // reflection warnings on every run, so drop those.
  const detail = String(err.stderr ?? '')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('WARNING'))
    .join('\n')
  console.error(`Could not read the hierarchy from ${udid}.\n${detail}`)
  process.exit(1)
}

// Maestro writes a deprecation/telemetry line or two before the JSON on some
// runs, so start at the first brace rather than parsing the whole of stdout.
const jsonStart = out.indexOf('{')
if (jsonStart < 0) {
  console.error('Maestro returned no hierarchy JSON.')
  process.exit(1)
}
const json = out.slice(jsonStart)
if (raw) {
  console.log(json)
  process.exit(0)
}

const rows = []
const walk = (node, depth) => {
  const a = node.attributes ?? {}
  const text = a.text || a.accessibilityText || ''
  const id = a['resource-id'] || ''
  if (id || text) rows.push({ depth, id, text, bounds: a.bounds ?? '' })
  for (const child of node.children ?? []) walk(child, depth + 1)
}
walk(JSON.parse(json), 0)

if (rows.length === 0) {
  console.log('Nothing addressable on screen.')
  process.exit(0)
}

const width = Math.max(11, ...rows.map((r) => r.id.length))
console.log(`${'testID'.padEnd(width)}  ${'text'.padEnd(64)}  bounds`)
for (const r of rows) {
  const text = r.text.length > 64 ? `${r.text.slice(0, 61)}...` : r.text
  console.log(`${(r.id || '—').padEnd(width)}  ${text.padEnd(64)}  ${r.bounds}`)
}

// Repeated testIDs need an index or another selector to disambiguate. Prefer a
// unique id when the identity itself matters to the flow.
const seen = new Map()
for (const r of rows) if (r.id) seen.set(r.id, (seen.get(r.id) ?? 0) + 1)
const dupes = [...seen].filter(([, n]) => n > 1)
if (dupes.length > 0) {
  console.log(`\nRepeated testIDs (use a unique id or an index):`)
  for (const [id, n] of dupes) console.log(`  ${id} ×${n}`)
}
