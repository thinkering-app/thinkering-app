export type { CoreContext } from './context'
export * from './domain'
export * from './schemas/blocks'
export * from './schemas/activity-doc'
export type { LibraryItem } from './library/types'
export { LIBRARY_ITEMS, getLibraryItem, libraryItemsForSection } from './library/items'
export { localDateOf, isSameLocalDay, type LocalDate } from './scheduler/local-date'
export { planToday, tierForSection, type SchedulerGoal, type CardPick, type TodayPlan } from './scheduler/plan'
export {
  FIXTURE_ACTIVITY_DOCS,
  FIXTURE_DOC_APPLY,
  FIXTURE_DOC_INTRODUCE,
  FIXTURE_DOC_STRENGTHEN,
} from './fixtures/activity-docs'
export * from './schemas/generations'
export * from './prompts/types'
export { PROMPTS, getPromptTemplate, isGenerationKind, type ImplementedKind } from './prompts/registry'
export { SHARED_PREAMBLE, ACTIVITY_DOC_FORMAT, libraryReference } from './prompts/preamble'
export {
  buildInterestContext,
  estimateTokens,
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  type InterestContextInput,
  type ContextAssemblyOptions,
} from './prompts/context-assembly'
export { checkActivityDoc, toneLintOutput, toneLintIssues, pageCountRange, type CheckIssue } from './prompts/checks'
export { SseParser, accumulateEvent, emptyAccumulator, type SseEvent, type StreamAccumulator } from './streaming/sse'
export { extractPartialActivityDoc, type PartialActivityDoc } from './streaming/partial-doc'
export { RECORDED_RESPONSES, type RecordedResponse } from './fixtures/recorded'
export { intakeApproachTemplate, type IntakeApproachParams } from './prompts/kinds/intake-approach'
export { intakeTopicsTemplate, type IntakeTopicsParams } from './prompts/kinds/intake-topics'
export { intakePathTemplate, type IntakePathParams } from './prompts/kinds/intake-path'
export { todayPlanTemplate, type TodayPlanParams } from './prompts/kinds/today-plan'
export { activityGenerateTemplate, type ActivityGenerateParams } from './prompts/kinds/activity-generate'
