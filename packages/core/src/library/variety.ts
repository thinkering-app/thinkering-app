/**
 * Variety across a section's activities (docs/06 §Selection). Left to choose,
 * G5a settles on a favourite — Next always introduces a new goal, so "not the
 * same item as yesterday for this goal" never applies there. So the choice is
 * narrowed in plain code: an item used for the section's last two activities
 * is not offered for the next one, unless it's all that's left.
 */
export const REPEAT_LIMIT = 2

/**
 * `usable` is what the next card could be made from; `recent` is the item ids
 * of the section's latest activities, newest first.
 */
export function varyLibraryItems(usable: readonly string[], recent: readonly string[]): string[] {
  const latest = recent.slice(0, REPEAT_LIMIT)
  if (latest.length < REPEAT_LIMIT || latest.some((id) => id !== latest[0])) return [...usable]
  const varied = usable.filter((id) => id !== latest[0])
  return varied.length > 0 ? varied : [...usable]
}
