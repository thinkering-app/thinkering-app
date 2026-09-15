/**
 * Canonical domain vocabulary (docs/00-overview.md). These string unions are the
 * single source of truth for enum-ish columns in packages/db and for Zod schemas.
 */

export const INTEREST_STATUSES = ['focus', 'exploring', 'archived'] as const
export type InterestStatus = (typeof INTEREST_STATUSES)[number]

export const WHY_CHOICES = ['career', 'personal_goal', 'fun'] as const
export type WhyChoice = (typeof WHY_CHOICES)[number]

export const EXPERIENCE_CHOICES = ['getting_started', 'explored', 'in_middle', 'experienced'] as const
export type ExperienceChoice = (typeof EXPERIENCE_CHOICES)[number]

export const FREQUENCIES = ['daily', 'several_weekly', 'when_i_can'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export const TOPIC_ORIGINS = ['motivation', 'foundational', 'adjacent', 'user'] as const
export type TopicOrigin = (typeof TOPIC_ORIGINS)[number]

/** Goal status is monotonic: not_started → introduced → strengthened → applied (displayed "Put to use", D1). */
export const GOAL_STATUSES = ['not_started', 'introduced', 'strengthened', 'applied'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const GOAL_SOURCES = ['intake', 'suggestion', 'reflection', 'user'] as const
export type GoalSource = (typeof GOAL_SOURCES)[number]

export const SECTIONS = ['next', 'strengthen', 'go_further'] as const
export type Section = (typeof SECTIONS)[number]

export const TIERS = ['introduce', 'strengthen', 'apply'] as const
export type Tier = (typeof TIERS)[number]

export const ACTIVITY_STATUSES = ['planned', 'ready', 'in_progress', 'completed', 'abandoned'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const RATINGS = ['down', 'mixed', 'up'] as const
export type Rating = (typeof RATINGS)[number]

export const RESOURCE_SOURCES = ['user', 'suggested'] as const
export type ResourceSource = (typeof RESOURCE_SOURCES)[number]

export const CONTEXT_KINDS = ['project', 'environment', 'person'] as const
export type ContextKind = (typeof CONTEXT_KINDS)[number]

export const CONCEPT_KINDS = ['concept', 'skill'] as const
export type ConceptKind = (typeof CONCEPT_KINDS)[number]

/** A key concept or skill beneath a goal (D16). Ids are stable so activities can reference them. */
export interface GoalConcept {
  id: string
  label: string
  kind: ConceptKind
}

/**
 * What a reflection changed about the path, stored on `reflections.changes`
 * (docs/03) as the human-readable record of what the learner accepted.
 */
export interface ReflectionChanges {
  added: string[]
  removed: string[]
  revised: string[]
  reordered: boolean
}

/** Which tier of activity each Today section serves. */
export const SECTION_TIER: Record<Section, Tier> = {
  next: 'introduce',
  strengthen: 'strengthen',
  go_further: 'apply',
}

/** The goal status reached by completing an activity of a tier. */
export const TIER_RESULT_STATUS: Record<Tier, GoalStatus> = {
  introduce: 'introduced',
  strengthen: 'strengthened',
  apply: 'applied',
}

const GOAL_STATUS_ORDER: Record<GoalStatus, number> = {
  not_started: 0,
  introduced: 1,
  strengthened: 2,
  applied: 3,
}

/**
 * Goal status only moves forward (docs/03 invariants). Returns the status a goal
 * should have after completing an activity of `tier` — never a regression.
 */
export function advanceGoalStatus(current: GoalStatus, tier: Tier): GoalStatus {
  const next = TIER_RESULT_STATUS[tier]
  return GOAL_STATUS_ORDER[next] > GOAL_STATUS_ORDER[current] ? next : current
}
