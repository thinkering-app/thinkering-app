import activityQuestion from '../../fixtures/recorded/activity.question/default.json'
import activityReview from '../../fixtures/recorded/activity.review/default.json'
import intakeApproach from '../../fixtures/recorded/intake.approach/default.json'
import intakeChoices from '../../fixtures/recorded/intake.choices/default.json'
import intakePath from '../../fixtures/recorded/intake.path/default.json'
import pathSuggestGoals from '../../fixtures/recorded/path.suggestGoals/default.json'
import reflectOpen from '../../fixtures/recorded/reflect.open/default.json'
import reflectUpdate from '../../fixtures/recorded/reflect.update/default.json'
import resourceDescribe from '../../fixtures/recorded/resource.describe/default.json'
import resourcesMore from '../../fixtures/recorded/resources.more/default.json'
import resourcesSearch from '../../fixtures/recorded/resources.search/default.json'
import routineCustomize from '../../fixtures/recorded/routine.customize/default.json'
import todayPlan from '../../fixtures/recorded/today.plan/default.json'

/**
 * Recorded responses bundled for fixture AI mode (docs/02 §AI access mode 3).
 * activity.generate is served from FIXTURE_ACTIVITY_DOCS per tier instead of a
 * recording, so the whole app runs offline at zero token cost.
 */

export interface RecordedResponse {
  kind: string
  promptVersion: number
  model: string
  fixture: string
  /** The raw model output text (JSON string for our kinds). */
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }
  latencyMs: number
}

export const RECORDED_RESPONSES: Record<string, RecordedResponse> = {
  'intake.approach': intakeApproach,
  'intake.choices': intakeChoices,
  'intake.path': intakePath,
  'today.plan': todayPlan,
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
