import { activityGenerateTemplate } from './kinds/activity-generate'
import { activityQuestionTemplate } from './kinds/activity-question'
import { activityReviewTemplate } from './kinds/activity-review'
import { intakeApproachTemplate } from './kinds/intake-approach'
import { intakePathTemplate } from './kinds/intake-path'
import { intakeChoicesTemplate } from './kinds/intake-choices'
import { intakeSuccessTemplate } from './kinds/intake-success'
import { intakeTopicsTemplate } from './kinds/intake-topics'
import { pathSuggestGoalsTemplate } from './kinds/path-suggest-goals'
import { reflectOpenTemplate } from './kinds/reflect-open'
import { reflectUpdateTemplate } from './kinds/reflect-update'
import { resourceDescribeTemplate } from './kinds/resource-describe'
import { resourcesMoreTemplate } from './kinds/resources-more'
import { resourcesSearchTemplate } from './kinds/resources-search'
import { routineCustomizeTemplate } from './kinds/routine-customize'
import { todayPlanTemplate } from './kinds/today-plan'
import type { AnyPromptTemplate, GenerationKind } from './types'

/**
 * Every prompt template this build generates by kind — all fourteen of
 * docs/04's generation map. The proxy rejects kinds present neither here nor
 * in `RETIRED_PROMPTS`.
 */
export const PROMPTS = {
  'intake.approach': intakeApproachTemplate,
  'intake.choices': intakeChoicesTemplate,
  'intake.path': intakePathTemplate,
  'today.plan': todayPlanTemplate,
  'activity.generate': activityGenerateTemplate,
  'activity.review': activityReviewTemplate,
  'activity.question': activityQuestionTemplate,
  'routine.customize': routineCustomizeTemplate,
  'path.suggestGoals': pathSuggestGoalsTemplate,
  'reflect.open': reflectOpenTemplate,
  'reflect.update': reflectUpdateTemplate,
  'resources.search': resourcesSearchTemplate,
  'resources.more': resourcesMoreTemplate,
  'resource.describe': resourceDescribeTemplate,
} as const

export type ImplementedKind = keyof typeof PROMPTS

/**
 * Kinds this build no longer generates but the proxy still answers, for one
 * release (docs/04 §Retired kinds). Separate from `PROMPTS` on purpose: the
 * snapshot tests, the input fixtures and the internal prompts page all iterate
 * `PROMPTS`, and none of them should show a prompt nobody sends any more.
 * Removing the shims is deleting this map and the two files it names.
 */
export const RETIRED_PROMPTS = {
  'intake.topics': intakeTopicsTemplate,
  'intake.success': intakeSuccessTemplate,
} as const

/**
 * Resolves what the proxy will render, live kinds first. Old installs send
 * retired kinds — answering them is the only thing standing between a build
 * that predates a rename and a dead intake, since there is no OTA.
 */
export function getPromptTemplate(kind: string): AnyPromptTemplate | undefined {
  const found =
    (PROMPTS as Partial<Record<string, unknown>>)[kind] ??
    (RETIRED_PROMPTS as Partial<Record<string, unknown>>)[kind]
  return found as AnyPromptTemplate | undefined
}

/** True for a kind only a build older than this one would send. */
export function isRetiredKind(kind: string): boolean {
  return kind in RETIRED_PROMPTS
}

export function isGenerationKind(kind: string): kind is GenerationKind {
  return kind in PROMPTS
}
