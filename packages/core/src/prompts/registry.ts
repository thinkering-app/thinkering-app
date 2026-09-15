import { activityGenerateTemplate } from './kinds/activity-generate'
import { intakeApproachTemplate } from './kinds/intake-approach'
import { intakePathTemplate } from './kinds/intake-path'
import { intakeTopicsTemplate } from './kinds/intake-topics'
import { todayPlanTemplate } from './kinds/today-plan'
import type { AnyPromptTemplate, GenerationKind } from './types'

/**
 * Every implemented prompt template by kind. G4/G6–G11 arrive with their work
 * packages (docs/09); the proxy rejects kinds not present here.
 */
export const PROMPTS = {
  'intake.approach': intakeApproachTemplate,
  'intake.topics': intakeTopicsTemplate,
  'intake.path': intakePathTemplate,
  'today.plan': todayPlanTemplate,
  'activity.generate': activityGenerateTemplate,
} as const

export type ImplementedKind = keyof typeof PROMPTS

export function getPromptTemplate(kind: string): AnyPromptTemplate | undefined {
  return (PROMPTS as Partial<Record<string, unknown>>)[kind] as AnyPromptTemplate | undefined
}

export function isGenerationKind(kind: string): kind is GenerationKind {
  return kind in PROMPTS
}
