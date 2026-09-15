/**
 * A stable fingerprint of a path, used as the cache key for G9's suggestions
 * (docs/04: "cached, regenerated when the path changes"). Deliberately blind to
 * two things: goal *status*, because progress changes daily and re-suggesting
 * after every completed activity is churn rather than a changed path; and goal
 * *order*, because reordering the same goals doesn't change what's missing
 * from them.
 */
export function pathSignature(goals: readonly { id: string; title: string }[]): string {
  // djb2 over the sorted id/title pairs — packages/core has no crypto, and this
  // only has to change when the path does.
  let hash = 5381
  for (const key of goals.map((g) => `${g.id}:${g.title}\n`).sort()) {
    for (const char of key) {
      hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0
    }
  }
  return hash.toString(36)
}
