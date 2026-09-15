import intakeApproach from '../../fixtures/recorded/intake.approach/default.json'
import intakePath from '../../fixtures/recorded/intake.path/default.json'
import intakeTopics from '../../fixtures/recorded/intake.topics/default.json'
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
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
  latencyMs: number
}

export const RECORDED_RESPONSES: Record<string, RecordedResponse> = {
  'intake.approach': intakeApproach,
  'intake.topics': intakeTopics,
  'intake.path': intakePath,
  'today.plan': todayPlan,
}
