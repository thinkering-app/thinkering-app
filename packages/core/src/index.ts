export type { CoreContext } from './context'
export * from './domain'
export * from './schemas/blocks'
export { isWebUrl, webUrlSchema } from './schemas/url'
export {
  TEXT_LIMITS,
  TEXT_LIMIT_COUNTER_FROM,
  SERVER_LIMIT_FACTOR,
  isOverLimit,
  type TextLimit,
} from './limits'
export * from './schemas/activity-doc'
export type { LibraryItem } from './library/types'
export { LIBRARY_ITEMS, getLibraryItem, libraryItemsForSection } from './library/items'
export {
  activeLibraryItems,
  libraryPrefsForSection,
  type LibraryPref,
  type LibrarySituation,
} from './library/prefs'
export { localDateOf, isSameLocalDay, type LocalDate } from './scheduler/local-date'
export {
  suggestInterests,
  SUGGESTED_INTERESTS,
  type SuggestionCandidate,
} from './scheduler/interests'
export {
  completedTodayBySection,
  type CompletionInput,
  type SectionCounts,
} from './scheduler/completion'
export {
  planToday,
  tierForSection,
  type SchedulerGoal,
  type CardPick,
  type TodayPlan,
  type PlanOptions,
} from './scheduler/plan'
export {
  FIXTURE_ACTIVITY_DOCS,
  fixtureDocForGoal,
  FIXTURE_DOC_APPLY,
  FIXTURE_DOC_INTRODUCE,
  FIXTURE_DOC_STRENGTHEN,
} from './fixtures/activity-docs'
export * from './schemas/generations'
export {
  responsePayloadSchema,
  parseResponsePayload,
  type ResponsePayload,
  type ResponsePayloadFor,
} from './schemas/responses'
export { describeResponse, pageToPlainText } from './activity/describe'
export {
  gradeMcq,
  gradeBlank,
  gradeFillBlank,
  gradeOrdering,
  gradeMatching,
} from './activity/grading'
export {
  reviewPageIndex,
  fillReviewPage,
  insertPageAfter,
  lastInteractivePageIndex,
  interactiveBlocksBeforeReview,
  docForReport,
} from './activity/doc-ops'
export {
  youtubeVideoId,
  resourceMediaOf,
  pickResource,
  groundBlocks,
  groundPages,
  type SavedResourceRef,
  type ResourceMedia,
} from './activity/resources'
export * from './prompts/types'
export {
  modelRequestFields,
  SEARCH_DEADLINE_MS,
  serverToolError,
  type ModelRequestFields,
} from './prompts/request'
export {
  PROMPTS,
  getPromptTemplate,
  isGenerationKind,
  type ImplementedKind,
} from './prompts/registry'
export { SHARED_PREAMBLE, ACTIVITY_DOC_FORMAT, libraryReference } from './prompts/preamble'
export {
  buildInterestContext,
  estimateTokens,
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  type InterestContextInput,
  type ContextAssemblyOptions,
} from './prompts/context-assembly'
export {
  blockWordCount,
  checkActivityDoc,
  checkReviewBlocks,
  REVIEW_MAX_WORDS,
  REVIEW_WORDS_ASKED,
  SUMMARY_MAX_WORDS,
  SUMMARY_WORDS_ASKED,
  toneLintOutput,
  toneLintIssues,
  pageCountRange,
  type CheckIssue,
} from './prompts/checks'
export {
  SseParser,
  accumulateEvent,
  emptyAccumulator,
  type SseEvent,
  type StreamAccumulator,
} from './streaming/sse'
export { extractPartialActivityDoc, type PartialActivityDoc } from './streaming/partial-doc'
export { extractPartialPath, type PartialPath, type PathGoal } from './streaming/partial-path'
export { extractPartialBlocks } from './streaming/partial-blocks'
export {
  extractPartialTopics,
  type ChoiceTopic,
  type PartialTopics,
} from './streaming/partial-topics'
export { extractJsonText } from './streaming/json'
export { placeInterest } from './intake/placement'
export {
  EMPTY_INTAKE_ANSWERS,
  furthestIntakeStep,
  intakeAnswersSchema,
  intakeDraftSchema,
  isDraftWorthKeeping,
  parseIntakeDraft,
  resumeIntakeStep,
  type IntakeAnswers,
  type IntakeDraft,
} from './intake/draft'
export { RECORDED_RESPONSES, type RecordedResponse } from './fixtures/recorded'
export { intakeApproachTemplate, type IntakeApproachParams } from './prompts/kinds/intake-approach'
export { intakeChoicesTemplate, type IntakeChoicesParams } from './prompts/kinds/intake-choices'
export { intakePathTemplate, type IntakePathParams } from './prompts/kinds/intake-path'
export { todayPlanTemplate, type TodayPlanParams } from './prompts/kinds/today-plan'
export {
  activityGenerateTemplate,
  type ActivityGenerateParams,
} from './prompts/kinds/activity-generate'
export { activityReviewTemplate, type ActivityReviewParams } from './prompts/kinds/activity-review'
export {
  activityQuestionTemplate,
  type ActivityQuestionParams,
} from './prompts/kinds/activity-question'
export {
  routineCustomizeTemplate,
  type RoutineCustomizeParams,
} from './prompts/kinds/routine-customize'
export {
  pathSuggestGoalsTemplate,
  type PathSuggestGoalsParams,
} from './prompts/kinds/path-suggest-goals'
export { reflectOpenTemplate, type ReflectOpenParams } from './prompts/kinds/reflect-open'
export { reflectUpdateTemplate, type ReflectUpdateParams } from './prompts/kinds/reflect-update'
export {
  resourcesSearchTemplate,
  type ResourcesSearchParams,
} from './prompts/kinds/resources-search'
export { resourcesMoreTemplate, type ResourcesMoreParams } from './prompts/kinds/resources-more'
export {
  resourceDescribeTemplate,
  type ResourceDescribeParams,
} from './prompts/kinds/resource-describe'
export { sortOrderBetween, respreadSortOrders } from './path/ordering'
export { conceptCoverage, type CoverageActivity } from './path/coverage'
export { pathSignature } from './path/signature'
export {
  goalRefs,
  planReflection,
  acceptProposal,
  dismissProposal,
  acceptAddition,
  dismissAddition,
  addOwnGoal,
  toggleRemoved,
  moveDraft,
  draftChanges,
  type DraftGoal,
  type DraftProposal,
  type ReflectionGoal,
  type ReflectionPlan,
  type SuggestedAddition,
} from './path/reflection'
export {
  outcomeParts,
  type OutcomeInput,
  type OutcomeParts,
  type OutcomeVerb,
} from './history/outcome'
export { groupByLocalDay, type DayGroup } from './history/grouping'
export {
  isSameMonth,
  monthBoundsMs,
  monthGrid,
  monthLabel,
  shiftMonth,
  WEEKDAY_LABELS,
  yearMonthOf,
  type CalendarDay,
  type YearMonth,
} from './history/calendar'
export {
  coarseScreen,
  featurebasePortalUrl,
  sanitizeFeedbackContext,
  FEEDBACK_PLATFORMS,
  FEEDBACK_SCREENS,
  type FeedbackContext,
  type FeedbackPlatform,
  type FeedbackScreen,
} from './feedback/context'
export {
  mergePull,
  pickWinner,
  selectPush,
  type MergeWinner,
  type PullMerge,
  type SyncRowMeta,
} from './sync/merge'
export {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_EVENT_PROPERTIES,
  ACTIVITY_SOURCES,
  DAYS_SINCE_INSTALL_BUCKETS,
  DURATION_BUCKETS,
  LATENCY_BUCKETS,
  SETTINGS_KEYS,
  daysSinceInstallBucket,
  durationBucket,
  isAnalyticsEventName,
  latencyBucket,
  sanitizeAnalyticsProperties,
  type ActivitySource,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AnalyticsValue,
  type DaysSinceInstallBucket,
  type DurationBucket,
  type LatencyBucket,
  type NoProperties,
  type SettingsKey,
} from './analytics/events'
export { isAutomatedClient } from './analytics/automation'
export {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  type PrivacySection,
} from './privacy/copy'
export { LANGUAGES, LANGUAGE_NAMES, languageFromLocaleTag, type Language } from './language'
