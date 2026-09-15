import { activityGenerateTemplate } from './kinds/activity-generate'
import { activityQuestionTemplate } from './kinds/activity-question'
import { activityReviewTemplate } from './kinds/activity-review'
import { intakeApproachTemplate } from './kinds/intake-approach'
import { intakePathTemplate } from './kinds/intake-path'
import { intakeTopicsTemplate } from './kinds/intake-topics'
import { pathSuggestGoalsTemplate } from './kinds/path-suggest-goals'
import { reflectUpdateTemplate } from './kinds/reflect-update'
import { routineCustomizeTemplate } from './kinds/routine-customize'
import { todayPlanTemplate } from './kinds/today-plan'
import type { AnyPromptTemplate, GenerationKind } from './types'

/**
 * Every implemented prompt template by kind. G4 and G10 arrive with their work
 * packages (docs/09); the proxy rejects kinds not present here.
 */
export const PROMPTS = {
  'intake.approach': intakeApproachTemplate,
  'intake.topics': intakeTopicsTemplate,
  'intake.path': intakePathTemplate,
  'today.plan': todayPlanTemplate,
  'activity.generate': activityGenerateTemplate,
  'activity.review': activityReviewTemplate,
  'activity.question': activityQuestionTemplate,
  'routine.customize': routineCustomizeTemplate,
  'path.suggestGoals': pathSuggestGoalsTemplate,
  'reflect.update': reflectUpdateTemplate,
} as const

export type ImplementedKind = keyof typeof PROMPTS

export function getPromptTemplate(kind: string): AnyPromptTemplate | undefined {
  return (PROMPTS as Partial<Record<string, unknown>>)[kind] as AnyPromptTemplate | undefined
}

export function isGenerationKind(kind: string): kind is GenerationKind {
  return kind in PROMPTS
}
