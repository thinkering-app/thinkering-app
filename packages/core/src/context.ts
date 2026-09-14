/**
 * Injected context for everything in packages/core (docs/10-testing.md).
 * Ambient time and randomness are lint-banned here; callers supply both.
 */
export interface CoreContext {
  /** Current time, epoch ms UTC. */
  now: () => number
  /** New UUIDv7. */
  newId: () => string
}
