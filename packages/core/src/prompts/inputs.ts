import activityGenerate from '../../fixtures/prompt-inputs/activity.generate.json'
import activityQuestion from '../../fixtures/prompt-inputs/activity.question.json'
import activityReview from '../../fixtures/prompt-inputs/activity.review.json'
import intakeApproach from '../../fixtures/prompt-inputs/intake.approach.json'
import intakePath from '../../fixtures/prompt-inputs/intake.path.json'
import intakeOutcomes from '../../fixtures/prompt-inputs/intake.outcomes.json'
import intakeTopicOptions from '../../fixtures/prompt-inputs/intake.topicOptions.json'
import pathSuggestGoals from '../../fixtures/prompt-inputs/path.suggestGoals.json'
import reflectOpen from '../../fixtures/prompt-inputs/reflect.open.json'
import reflectUpdate from '../../fixtures/prompt-inputs/reflect.update.json'
import resourceDescribe from '../../fixtures/prompt-inputs/resource.describe.json'
import resourcesMore from '../../fixtures/prompt-inputs/resources.more.json'
import resourcesSearch from '../../fixtures/prompt-inputs/resources.search.json'
import routineCustomize from '../../fixtures/prompt-inputs/routine.customize.json'
import todayPlan from '../../fixtures/prompt-inputs/today.plan.json'
import { PROMPTS, type ImplementedKind } from './registry'
import type { RenderedPrompt } from './types'

/**
 * The default input fixture per kind, bundled rather than read from disk so
 * anything that can import core can render a prompt: the snapshot tests, the
 * prompt scripts, and the internal prompt page in apps/web. One default each —
 * the extra variants in `fixtures/prompt-inputs` stay file-loaded.
 */
export const PROMPT_INPUTS: Record<ImplementedKind, unknown> = {
  'intake.approach': intakeApproach,
  'intake.outcomes': intakeOutcomes,
  'intake.topicOptions': intakeTopicOptions,
  'intake.path': intakePath,
  'today.plan': todayPlan,
  'activity.generate': activityGenerate,
  'activity.review': activityReview,
  'activity.question': activityQuestion,
  'routine.customize': routineCustomize,
  'path.suggestGoals': pathSuggestGoals,
  'reflect.open': reflectOpen,
  'reflect.update': reflectUpdate,
  'resources.search': resourcesSearch,
  'resources.more': resourcesMore,
  'resource.describe': resourceDescribe,
}

/** Renders a kind against its default fixture — what the model would be sent. */
export function renderPromptFixture(kind: ImplementedKind): RenderedPrompt {
  const template = PROMPTS[kind]
  const params = template.paramsSchema.parse(PROMPT_INPUTS[kind])
  return template.render(params as never)
}
