/**
 * Fractional path ordering (docs/03: `goals.sort_order` is a real). Moving one
 * goal rewrites one row instead of renumbering the path, which keeps sync
 * churn proportional to the edit.
 */

const STEP = 1

/**
 * A sort order that places a goal between its two new neighbours. `null`
 * neighbours mean "no goal on that side" — the ends of the path.
 *
 * Returns `null` when the gap between the neighbours has collapsed below what
 * a double can represent; the caller then renumbers the path (see
 * `respreadSortOrders`). Repeated midpoints exhaust precision after ~50 moves
 * into the same slot, so this is rare but reachable.
 */
export function sortOrderBetween(before: number | null, after: number | null): number | null {
  if (before === null && after === null) return STEP
  if (before === null) return after! - STEP
  if (after === null) return before + STEP
  const mid = before + (after - before) / 2
  return mid > before && mid < after ? mid : null
}

/** Evenly spaced orders for a whole path, used when a midpoint runs out of room. */
export function respreadSortOrders(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * STEP)
}
