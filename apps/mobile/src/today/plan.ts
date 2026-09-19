import {
  activeLibraryItems,
  localDateOf,
  planToday,
  SECTIONS,
  suggestInterests,
  tierForSection,
  type CardPick,
  type DailyPlanCard,
  type DailyPlanOutput,
  type LocalDate,
  type Section,
  type TodayPlanParams,
} from '@thinkering/core'
import {
  createActivity,
  createDailyPlan,
  listGoals,
  listHistory,
  listLibraryPrefs,
  listOpenActivities,
  listPlannedForDate,
  resourcesByGoal,
  schedulerGoals,
  softDeleteActivity,
  type Activity,
  type Goal,
  type Interest,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { interestContext, librarySituation } from '@/ai/context'
import { db, repoContext } from '@/db'
import { deviceTimeZone } from '@/time'

/**
 * The day's cards for one interest (docs/01 §3). The scheduler picks the goals
 * deterministically; G5a only picks a library item and writes a title for each
 * pick. The resulting `activities` rows *are* the cached plan (docs/03), so a
 * second app open costs nothing.
 *
 * Each section keeps one card open. An unfinished card stays until it's done,
 * across days; a section gets a new card only when it has none left — a card
 * just finished, or a configuration change that dropped the untouched one. So
 * a new day costs nothing until something there has actually been used.
 */

const SECTION_KEYS = { next: 'next', strengthen: 'strengthen', go_further: 'goFurther' } as const

type PlanKey = (typeof SECTION_KEYS)[Section]
type Picks = Record<PlanKey, CardPick[]>

type PlanPick = TodayPlanParams['picks']['next'][number]

/** Finished today is a day's worth; this reaches past it with room to spare. */
const HISTORY_LOOKBACK = 30

/**
 * What Today holds for an interest: every open card, whenever it was planned,
 * then what was finished today. Yesterday's finished cards are gone; its
 * unfinished ones are still here.
 */
export function todaysCards(interestId: string, today: LocalDate): Activity[] {
  const timeZone = deviceTimeZone()
  const doneToday = listHistory(db, { interestId, limit: HISTORY_LOOKBACK })
    .filter((a) => a.completedAt !== null && localDateOf(a.completedAt, timeZone) === today)
    .reverse()
  return [...listOpenActivities(db, interestId), ...doneToday]
}

/**
 * Explore → All suggests from a couple of the exploring interests, not every
 * one (`suggestInterests`); the rest wait until they're opened on their own.
 */
export function suggestedInterests(interests: Interest[], today: LocalDate): Interest[] {
  const timeZone = deviceTimeZone()
  const ids = suggestInterests(
    interests.map((interest) => {
      const last = listHistory(db, { interestId: interest.id, limit: HISTORY_LOOKBACK })
        .map((a) => localDateOf(a.completedAt!, timeZone))
        .find((day) => day < today)
      return { id: interest.id, lastPracticed: last ?? null, sortOrder: interest.sortOrder }
    }),
  )
  return ids.map((id) => interests.find((i) => i.id === id)!)
}

/**
 * What each section needs: nothing while it still has an open card, otherwise
 * the scheduler's pick, skipping goals the section already had today so
 * finishing a card moves on rather than repeating it.
 */
function picksToFill(interestId: string, today: LocalDate): Picks {
  const none: Picks = { next: [], strengthen: [], goFurther: [] }
  if (listGoals(db, interestId).length === 0) return none

  const cards = todaysCards(interestId, today)
  const plan = planToday(schedulerGoals(db, interestId), { exclude: goalsHadToday(cards) })
  const picks = { ...none }
  for (const section of SECTIONS) {
    const open = cards.some((a) => a.section === section && a.status !== 'completed')
    if (!open) picks[SECTION_KEYS[section]] = plan[SECTION_KEYS[section]]
  }
  return picks
}

function goalsHadToday(cards: readonly Activity[]): Record<Section, string[]> {
  const had: Record<Section, string[]> = { next: [], strengthen: [], go_further: [] }
  for (const card of cards) if (card.goalId) had[card.section].push(card.goalId)
  return had
}

/** Whether any section of this interest is waiting on a card. */
export function needsCards(interestId: string, today: LocalDate): boolean {
  const picks = picksToFill(interestId, today)
  return SECTIONS.some((section) => picks[SECTION_KEYS[section]].length > 0)
}

/**
 * A configuration change re-plans (docs/03 invariants). Only untouched cards
 * go: something already started or finished stays, and a section left with
 * nothing open gets a fresh card on the next `ensureDailyPlan`.
 */
export function dropUntouchedCards(interestId: string, section?: Section): void {
  for (const activity of listOpenActivities(db, interestId)) {
    if (section && activity.section !== section) continue
    if (activity.status === 'planned' || activity.status === 'ready') {
      softDeleteActivity(db, repoContext, activity.id)
    }
  }
}

/**
 * Gives every section that's waiting its card, and returns the new cards so
 * their documents can be written ahead. Safe to call on every app open: it
 * returns immediately when nothing is waiting.
 */
export async function ensureDailyPlan(
  interest: Interest,
  today: LocalDate,
  signal?: AbortSignal,
): Promise<Activity[]> {
  const picks = picksToFill(interest.id, today)
  if (SECTIONS.every((section) => picks[SECTION_KEYS[section]].length === 0)) return []

  const goals = listGoals(db, interest.id)
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const cards = await planCards(
    interest,
    today,
    goals,
    {
      next: describePicks(picks.next, goalsById),
      strengthen: describePicks(picks.strengthen, goalsById),
      goFurther: describePicks(picks.goFurther, goalsById),
    },
    signal,
  )
  return cards.length > 0
    ? createDailyPlan(db, repoContext, { interestId: interest.id, plannedFor: today, cards })
    : []
}

/** What the learner asked for with a section's + card (docs/01 §3). */
export interface ActivityRequest {
  section: Section
  /** The goal they chose, if any. */
  goalId: string | null
  /** What to focus on or how they want to learn it; may be empty. */
  focus: string
}

/**
 * What a request with neither a goal nor a focus lands on: the section's
 * own pick, preferring a goal it hasn't had today. Null when the scheduler has
 * nothing for the section (Next, once every goal is under way).
 */
export function defaultRequestPick(
  interestId: string,
  today: LocalDate,
  section: Section,
): CardPick | null {
  const goals = schedulerGoals(db, interestId)
  const key = SECTION_KEYS[section]
  const cards = todaysCards(interestId, today)
  return (
    planToday(goals, { exclude: goalsHadToday(cards) })[key][0] ?? planToday(goals)[key][0] ?? null
  )
}

/**
 * The + card: one activity in a section, shaped by what the learner asked for.
 * The card lands on today's plan like any other; its document is the caller's
 * to write.
 */
export async function requestActivity(
  interest: Interest,
  today: LocalDate,
  request: ActivityRequest,
): Promise<Activity> {
  const goals = listGoals(db, interest.id)
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const focus = request.focus.trim()
  const pick: CardPick | null = request.goalId
    ? { kind: 'goal', goalId: request.goalId, tier: tierForSection(request.section) }
    : focus
      ? null
      : defaultRequestPick(interest.id, today, request.section)
  if (!pick && !focus) throw new Error('nothing to plan for this section')

  const [described] = pick ? describePicks([pick], goalsById) : [{ goalId: null, goalTitle: null }]
  const picks: TodayPlanParams['picks'] = { next: [], strengthen: [], goFurther: [] }
  picks[SECTION_KEYS[request.section]] = [{ ...described!, ...(focus ? { focus } : {}) }]

  const [card] = await planCards(interest, today, goals, picks)
  if (!card) throw new Error('no card came back')
  return createActivity(db, repoContext, {
    ...card,
    interestId: interest.id,
    plannedFor: today,
    focus: focus || null,
  })
}

/**
 * G5a for a set of picks, zipped back into cards. Only the sections with
 * picks are asked about — after a finished card that's one section, and asking
 * for the others would duplicate what's on screen.
 */
async function planCards(
  interest: Interest,
  today: LocalDate,
  goals: Goal[],
  picks: TodayPlanParams['picks'],
  signal?: AbortSignal,
) {
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
    picks,
    activeItems: activeIds,
    yesterdayItems: yesterdayItems(interest.id, today),
    // Lets G5a prefer a resource-shaped item for a goal that actually has one.
    matchedResources: resourcesByGoal(db, interest.id),
  }

  const { output } = await callAi<DailyPlanOutput>('today.plan', params, {
    interestId: interest.id,
    signal,
  })

  return SECTIONS.flatMap((section) => {
    const key = SECTION_KEYS[section]
    return picks[key].map((pick, index) =>
      toCard(section, pick, output[key][index], activeIds[key], goalsById, interest.sessionMinutes),
    )
  })
}

function describePicks(picks: CardPick[], goalsById: Map<string, Goal>): PlanPick[] {
  return picks.map((pick) =>
    pick.kind === 'goal'
      ? { goalId: pick.goalId, goalTitle: goalsById.get(pick.goalId)?.title ?? null }
      : { goalId: null, goalTitle: null },
  )
}

/**
 * Zips a pick with the model's card for it. The pick owns the goal — the
 * model's `goalId` is never trusted, only its item choice, title, topic and
 * estimate, and an item outside the active set falls back to the first active
 * one rather than generating something the user turned off.
 */
function toCard(
  section: Section,
  pick: PlanPick,
  card: DailyPlanCard | undefined,
  activeIds: string[],
  goalsById: Map<string, Goal>,
  sessionMinutes: number,
) {
  const goal = pick.goalId ? goalsById.get(pick.goalId) : undefined
  const libraryItemId =
    card && activeIds.includes(card.libraryItemId)
      ? card.libraryItemId
      : (activeIds[0] ?? 'plain-explainer')
  return {
    goalId: pick.goalId,
    // Goal-less cards need something to show where the goal would be.
    topic: pick.goalId ? null : (card?.topic ?? pick.focus ?? null),
    section,
    tier: tierForSection(section),
    libraryItemId,
    title: card?.title ?? goal?.title ?? pick.focus ?? 'Today',
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
