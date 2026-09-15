import type { Section } from '../domain'
import { localDateOf, type LocalDate } from './local-date'

/**
 * Section completion state on Today (docs/01 §3): a section's heading takes its
 * accent wash and a count once something in it is completed *today*. The day is
 * the device-local one (D12), and it's keyed on when the activity was completed,
 * not when it was planned — yesterday's leftover finished this morning counts
 * for this morning.
 */

export interface CompletionInput {
  section: Section
  completedAt: number | null
}

export type SectionCounts = Record<Section, number>

export function completedTodayBySection(
  activities: readonly CompletionInput[],
  opts: { today: LocalDate; timeZone: string },
): SectionCounts {
  const counts: SectionCounts = { next: 0, strengthen: 0, go_further: 0 }
  for (const activity of activities) {
    if (activity.completedAt === null) continue
    if (localDateOf(activity.completedAt, opts.timeZone) !== opts.today) continue
    counts[activity.section] += 1
  }
  return counts
}
