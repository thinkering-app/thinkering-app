import type { GoalStatus, Section, Tier } from '../domain'

/**
 * Today card selection (docs/01 §3, D7). Pure and deterministic: DB state in,
 * per-section goal picks out. The LLM (G5a) later chooses a library item and
 * writes a human title for each pick — it never chooses the goals.
 */

export interface SchedulerGoal {
  id: string
  status: GoalStatus
  /** Path order. */
  sortOrder: number
  introducedAt: number | null
  strengthenedAt: number | null
  appliedAt: number | null
}

export type CardPick =
  /** An activity card targeting a specific goal at the section's tier. */
  | { kind: 'goal'; goalId: string; tier: Tier }
  /** Early-days strengthen fallback: a prerequisite topic to their goals, no goal yet. */
  | { kind: 'prerequisite'; tier: 'strengthen' }

export interface TodayPlan {
  next: CardPick[]
  strengthen: CardPick[]
  goFurther: CardPick[]
  /** Show the "Reflect on progress & update path" card in Next (≤3 not_started goals left). */
  showReflectCard: boolean
}

const STRENGTHEN_CARDS = 2
const GO_FURTHER_CARDS = 2
const REFLECT_THRESHOLD = 3

function byPathOrder(a: SchedulerGoal, b: SchedulerGoal): number {
  return a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** Ascending by a timestamp (nulls last), path order as tiebreak — "least recently X first". */
function byOldest(at: (g: SchedulerGoal) => number | null) {
  return (a: SchedulerGoal, b: SchedulerGoal): number => {
    const [ta, tb] = [at(a) ?? Number.MAX_SAFE_INTEGER, at(b) ?? Number.MAX_SAFE_INTEGER]
    return ta - tb || byPathOrder(a, b)
  }
}

function takeDistinct(tier: Tier, count: number, ...classes: SchedulerGoal[][]): CardPick[] {
  const picks: CardPick[] = []
  const used = new Set<string>()
  for (const cls of classes) {
    for (const goal of cls) {
      if (picks.length >= count) return picks
      if (used.has(goal.id)) continue
      used.add(goal.id)
      picks.push({ kind: 'goal', goalId: goal.id, tier })
    }
  }
  return picks
}

/**
 * Plan Today's cards for one interest. `goals` are the interest's live
 * (non-deleted) goals in any order.
 */
export function planToday(goals: readonly SchedulerGoal[]): TodayPlan {
  const path = [...goals].sort(byPathOrder)
  const notStarted = path.filter((g) => g.status === 'not_started')

  // Next (1 card): an introduce activity for the first not_started goal in the path.
  const next: CardPick[] =
    notStarted.length > 0 ? [{ kind: 'goal', goalId: notStarted[0]!.id, tier: 'introduce' }] : []

  // Strengthen (2 cards): (1) introduced but not yet strengthened; (2) already
  // strengthened, least-recently-strengthened first (spaced review); (3) a
  // prerequisite topic (early-days fallback).
  const introducedOnly = path.filter((g) => g.status === 'introduced')
  const strengthenedPlus = path
    .filter((g) => g.status === 'strengthened' || g.status === 'applied')
    .sort(byOldest((g) => g.strengthenedAt))
  const strengthen = takeDistinct('strengthen', STRENGTHEN_CARDS, introducedOnly, strengthenedPlus)
  while (strengthen.length < STRENGTHEN_CARDS) {
    strengthen.push({ kind: 'prerequisite', tier: 'strengthen' })
  }

  // Go further (2 cards): (1) strengthened but not yet applied; (2) already applied,
  // least-recently first; (3) merely introduced — or the first goal for brand-new users.
  const strengthenedOnly = path.filter((g) => g.status === 'strengthened')
  const applied = path.filter((g) => g.status === 'applied').sort(byOldest((g) => g.appliedAt))
  const goFurther = takeDistinct(
    'apply',
    GO_FURTHER_CARDS,
    strengthenedOnly,
    applied,
    introducedOnly,
    path.slice(0, 1),
  )

  return {
    next,
    strengthen,
    goFurther,
    showReflectCard: path.length > 0 && notStarted.length <= REFLECT_THRESHOLD,
  }
}

/** The tier an activity completes at for a given section. Re-exported convenience for card → activity creation. */
export function tierForSection(section: Section): Tier {
  return section === 'next' ? 'introduce' : section === 'strengthen' ? 'strengthen' : 'apply'
}
