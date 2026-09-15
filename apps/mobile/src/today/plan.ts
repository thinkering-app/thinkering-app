import {
  activeLibraryItems,
  planToday,
  SECTIONS,
  tierForSection,
  type CardPick,
  type DailyPlanCard,
  type DailyPlanOutput,
  type LocalDate,
  type Section,
  type TodayPlanParams,
} from '@thinkering/core'
import {
  abandonStalePlans,
  createDailyPlan,
  listGoals,
  listLibraryPrefs,
  listPlannedForDate,
  resourcesByGoal,
  schedulerGoals,
  softDeleteActivity,
  type Goal,
  type Interest,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { interestContext, librarySituation } from '@/ai/context'
import { db, repoContext } from '@/db'

/**
 * The day's cards for one interest (docs/01 §3). The scheduler picks the goals
 * deterministically; G5a only picks a library item and writes a title for each
 * pick. The resulting `activities` rows *are* the cached plan — one planned set
 * per interest per local date (docs/03) — so a second app open costs nothing.
 */

const SECTION_KEYS = { next: 'next', strengthen: 'strengthen', go_further: 'goFurther' } as const

type PlanKey = (typeof SECTION_KEYS)[Section]

/**
 * Sections with no live card for today — what still needs planning. Normally
 * all three (a fresh day) or none; a single section comes back after a
 * configuration change dropped its untouched cards.
 */
export function unplannedSections(interestId: string, today: LocalDate): Section[] {
  const live = listPlannedForDate(db, interestId, today).filter((a) => a.status !== 'abandoned')
  return SECTIONS.filter((section) => !live.some((a) => a.section === section))
}

export function hasPlanFor(interestId: string, today: LocalDate): boolean {
  return unplannedSections(interestId, today).length === 0
}

/**
 * A configuration change re-plans today (docs/03 invariants). Only untouched
 * cards go: something already started or finished stays, and that section keeps
 * what it has until tomorrow.
 */
export function dropUntouchedCards(interestId: string, today: LocalDate, section?: Section): void {
  for (const activity of listPlannedForDate(db, interestId, today)) {
    if (section && activity.section !== section) continue
    if (activity.status === 'planned' || activity.status === 'ready') {
      softDeleteActivity(db, repoContext, activity.id)
    }
  }
}

/**
 * Ensures the interest has today's cards, generating them if not. Safe to call
 * on every app open: it returns immediately once a plan exists.
 */
export async function ensureDailyPlan(
  interest: Interest,
  today: LocalDate,
  signal?: AbortSignal,
): Promise<void> {
  // Yesterday's unfinished cards stop being resumable once the day turns (docs/05).
  abandonStalePlans(db, repoContext, { interestId: interest.id, before: today })
  const missing = unplannedSections(interest.id, today)
  if (missing.length === 0) return

  const goals = listGoals(db, interest.id)
  if (goals.length === 0) return

  const plan = planToday(schedulerGoals(db, interest.id))
  // Only the sections that still need cards — after a configure change that's
  // one section, and asking for the others would duplicate what's on screen.
  const picks: Record<PlanKey, CardPick[]> = {
    next: missing.includes('next') ? plan.next : [],
    strengthen: missing.includes('strengthen') ? plan.strengthen : [],
    goFurther: missing.includes('go_further') ? plan.goFurther : [],
  }
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const prefs = listLibraryPrefs(db, interest.id)
  const situation = librarySituation(goals)
  const activeIds = {
    next: activeLibraryItems('next', prefs, situation).map((i) => i.id),
    strengthen: activeLibraryItems('strengthen', prefs, situation).map((i) => i.id),
    goFurther: activeLibraryItems('go_further', prefs, situation).map((i) => i.id),
  }

  const params: TodayPlanParams = {
    context: interestContext(interest, goals),
    sessionMinutes: interest.sessionMinutes,
    picks: {
      next: describePicks(picks.next, goalsById),
      strengthen: describePicks(picks.strengthen, goalsById),
      goFurther: describePicks(picks.goFurther, goalsById),
    },
    activeItems: activeIds,
    yesterdayItems: yesterdayItems(interest.id, today),
    // Lets G5a prefer a resource-shaped item for a goal that actually has one.
    matchedResources: resourcesByGoal(db, interest.id),
  }

  if (SECTIONS.every((section) => picks[SECTION_KEYS[section]].length === 0)) return

  const { output } = await callAi<DailyPlanOutput>('today.plan', params, {
    interestId: interest.id,
    signal,
  })

  const cards = SECTIONS.flatMap((section) => {
    const key = SECTION_KEYS[section]
    return picks[key].map((pick, index) =>
      toCard(section, pick, output[key][index], activeIds[key], goalsById, interest.sessionMinutes),
    )
  })
  if (cards.length > 0) {
    createDailyPlan(db, repoContext, { interestId: interest.id, plannedFor: today, cards })
  }
}

function describePicks(picks: CardPick[], goalsById: Map<string, Goal>) {
  return picks.map((pick) =>
    pick.kind === 'goal'
      ? { goalId: pick.goalId, goalTitle: goalsById.get(pick.goalId)?.title ?? null }
      : { goalId: null, goalTitle: null },
  )
}

/**
 * Zips a scheduler pick with the model's card for it. The scheduler owns the
 * goal — the model's `goalId` is never trusted, only its item choice, title and
 * estimate, and an item outside the active set falls back to the first active
 * one rather than generating something the user turned off.
 */
function toCard(
  section: Section,
  pick: CardPick,
  card: DailyPlanCard | undefined,
  activeIds: string[],
  goalsById: Map<string, Goal>,
  sessionMinutes: number,
) {
  const goalId = pick.kind === 'goal' ? pick.goalId : null
  const goal = goalId ? goalsById.get(goalId) : undefined
  const libraryItemId =
    card && activeIds.includes(card.libraryItemId)
      ? card.libraryItemId
      : (activeIds[0] ?? 'plain-explainer')
  return {
    goalId,
    topic: pick.kind === 'prerequisite' ? (card?.topic ?? null) : null,
    section,
    tier: tierForSection(section),
    libraryItemId,
    title: card?.title ?? goal?.title ?? 'Today',
    estMinutes: card?.estMinutes ?? sessionMinutes,
  }
}

/** What each goal got yesterday, so G5a can avoid repeating it (docs/06 §Selection). */
function yesterdayItems(interestId: string, today: LocalDate) {
  const [y, m, d] = today.split('-').map(Number)
  const yesterday = new Date(Date.UTC(y!, m! - 1, d! - 1)).toISOString().slice(0, 10)
  return listPlannedForDate(db, interestId, yesterday)
    .filter((a) => a.goalId !== null)
    .map((a) => ({ goalId: a.goalId!, libraryItemId: a.libraryItemId }))
}
