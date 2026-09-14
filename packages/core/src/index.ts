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
