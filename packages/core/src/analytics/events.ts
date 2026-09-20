import type { Frequency, GoalSource, Rating, ResourceSource, Section, Tier } from '../domain'
import type { FeedbackPlatform, FeedbackScreen } from '../feedback/context'

/**
 * The analytics event schema (docs/08) as a type. This union *is* the
 * allowlist: adding an event means editing it here and in docs/08, and
 * `sanitizeAnalyticsProperties` drops at runtime anything the union doesn't
 * declare. Nothing here may carry an interest name, goal title, activity
 * title, user text, URL or email, and durations travel as buckets rather than
 * raw milliseconds.
 *
 * The wrapper that captures these lives in `apps/mobile/src/analytics`; the
 * schema lives in core so its buckets and allowlist are unit-testable.
 */

// ── buckets ─────────────────────────────────────────────────────────────────

export const DURATION_BUCKETS = [
  '<10s',
  '10-30s',
  '30-60s',
  '1-3m',
  '3-10m',
  '10-20m',
  '20-45m',
  '45m+',
] as const
export type DurationBucket = (typeof DURATION_BUCKETS)[number]

export const LATENCY_BUCKETS = [
  '<500ms',
  '0.5-1s',
  '1-2s',
  '2-5s',
  '5-10s',
  '10-30s',
  '30s+',
] as const
export type LatencyBucket = (typeof LATENCY_BUCKETS)[number]

export const DAYS_SINCE_INSTALL_BUCKETS = ['0', '1-6', '7-29', '30-89', '90+'] as const
export type DaysSinceInstallBucket = (typeof DAYS_SINCE_INSTALL_BUCKETS)[number]

const SECOND = 1000
const MINUTE = 60 * SECOND

/** Wall-clock spent on something, coarsened. Negative or unmeasurable input reads as the smallest bucket. */
export function durationBucket(ms: number): DurationBucket {
  if (Number.isNaN(ms) || ms < 10 * SECOND) return '<10s'
  if (ms < 30 * SECOND) return '10-30s'
  if (ms < MINUTE) return '30-60s'
  if (ms < 3 * MINUTE) return '1-3m'
  if (ms < 10 * MINUTE) return '3-10m'
  if (ms < 20 * MINUTE) return '10-20m'
  if (ms < 45 * MINUTE) return '20-45m'
  return '45m+'
}

/** Model round-trip time, coarsened. */
export function latencyBucket(ms: number): LatencyBucket {
  if (Number.isNaN(ms) || ms < 500) return '<500ms'
  if (ms < SECOND) return '0.5-1s'
  if (ms < 2 * SECOND) return '1-2s'
  if (ms < 5 * SECOND) return '2-5s'
  if (ms < 10 * SECOND) return '5-10s'
  if (ms < 30 * SECOND) return '10-30s'
  return '30s+'
}

/** Whole local-ish days between install and now, coarsened. Clock skew reads as day 0. */
export function daysSinceInstallBucket(installedAt: number, now: number): DaysSinceInstallBucket {
  const days = Math.floor((now - installedAt) / (24 * 60 * MINUTE))
  if (!Number.isFinite(days) || days < 1) return '0'
  if (days < 7) return '1-6'
  if (days < 30) return '7-29'
  if (days < 90) return '30-89'
  return '90+'
}

// ── the schema ──────────────────────────────────────────────────────────────

/** How the learner reached an activity. */
export const ACTIVITY_SOURCES = ['card', 'prefetch', 'resume'] as const
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number]

/** Settings whose change is worth a count. Never the value — only which knob moved. */
export const SETTINGS_KEYS = [
  'ai_mode',
  'analytics_opt_in',
  'session_replay_opt_in',
  'interest_status',
  'interest_order',
  'frequency',
  'session_minutes',
  'path_settings',
] as const
export type SettingsKey = (typeof SETTINGS_KEYS)[number]

/** An event that carries nothing but its name. */
export type NoProperties = Record<string, never>

export type AnalyticsEvent =
  | {
      event: 'app_opened'
      properties: {
        platform: FeedbackPlatform
        app_version: string
        days_since_install: DaysSinceInstallBucket
      }
    }
  | { event: 'intake_started'; properties: { is_first_interest: boolean; resumed: boolean } }
  | {
      event: 'intake_step_completed'
      properties: { step: number; duration_bucket: DurationBucket }
    }
  | {
      event: 'intake_completed'
      properties: { topics_selected_count: number; frequency: Frequency; session_minutes: number }
    }
  | { event: 'intake_abandoned'; properties: { last_step: number } }
  | {
      event: 'activity_started'
      properties: { section: Section; tier: Tier; library_item_id: string; source: ActivitySource }
    }
  | {
      event: 'activity_completed'
      properties: {
        section: Section
        tier: Tier
        library_item_id: string
        duration_bucket: DurationBucket
        pages: number
        questions_asked_count: number
        /** `none` when the learner skipped the rating. */
        rating: Rating | 'none'
      }
    }
  | { event: 'activity_abandoned'; properties: { tier: Tier; last_page_index: number } }
  | { event: 'question_asked'; properties: { tier: Tier } }
  | { event: 'reflection_completed'; properties: { changes_count: number } }
  | { event: 'goal_added'; properties: { source: GoalSource } }
  | { event: 'resource_added'; properties: { source: ResourceSource } }
  | { event: 'routine_configured'; properties: { via: 'checkboxes' | 'free_text' } }
  | { event: 'backup_enabled'; properties: NoProperties }
  | { event: 'backup_disabled'; properties: NoProperties }
  | { event: 'byok_enabled'; properties: NoProperties }
  | {
      event: 'ai_call'
      properties: {
        kind: string
        model: string
        latency_bucket: LatencyBucket
        status: 'ok' | 'error' | 'rate_limited'
      }
    }
  | { event: 'cap_reached'; properties: NoProperties }
  | { event: 'featurebase_opened'; properties: { screen: FeedbackScreen } }
  | {
      event: 'email_feedback_sent'
      properties: { screen: FeedbackScreen; included_context: boolean }
    }
  | { event: 'activity_report_sent'; properties: NoProperties }
  | { event: 'settings_changed'; properties: { key: SettingsKey } }

export type AnalyticsEventName = AnalyticsEvent['event']

export type AnalyticsProperties<N extends AnalyticsEventName> = Extract<
  AnalyticsEvent,
  { event: N }
>['properties']

/**
 * The same allowlist, at runtime. The type of this table forbids a key the
 * union doesn't have, and `_everyPropertyListed` below fails the build if the
 * union gains one this table is missing.
 */
export const ANALYTICS_EVENT_PROPERTIES: {
  [N in AnalyticsEventName]: readonly (keyof AnalyticsProperties<N> & string)[]
} = {
  app_opened: ['platform', 'app_version', 'days_since_install'],
  intake_started: ['is_first_interest', 'resumed'],
  intake_step_completed: ['step', 'duration_bucket'],
  intake_completed: ['topics_selected_count', 'frequency', 'session_minutes'],
  intake_abandoned: ['last_step'],
  activity_started: ['section', 'tier', 'library_item_id', 'source'],
  activity_completed: [
    'section',
    'tier',
    'library_item_id',
    'duration_bucket',
    'pages',
    'questions_asked_count',
    'rating',
  ],
  activity_abandoned: ['tier', 'last_page_index'],
  question_asked: ['tier'],
  reflection_completed: ['changes_count'],
  goal_added: ['source'],
  resource_added: ['source'],
  routine_configured: ['via'],
  backup_enabled: [],
  backup_disabled: [],
  byok_enabled: [],
  ai_call: ['kind', 'model', 'latency_bucket', 'status'],
  cap_reached: [],
  featurebase_opened: ['screen'],
  email_feedback_sent: ['screen', 'included_context'],
  activity_report_sent: [],
  settings_changed: ['key'],
}

type UnlistedProperty = {
  [N in AnalyticsEventName]: Exclude<
    keyof AnalyticsProperties<N>,
    (typeof ANALYTICS_EVENT_PROPERTIES)[N][number]
  >
}[AnalyticsEventName]

/** Compile-time: every declared property appears in the runtime allowlist. */
const _everyPropertyListed: UnlistedProperty extends never ? true : false = true
void _everyPropertyListed

export const ANALYTICS_EVENT_NAMES = Object.keys(ANALYTICS_EVENT_PROPERTIES) as AnalyticsEventName[]

export function isAnalyticsEventName(name: string): name is AnalyticsEventName {
  return Object.prototype.hasOwnProperty.call(ANALYTICS_EVENT_PROPERTIES, name)
}

/** The only value shapes a property may take once sanitized. */
export type AnalyticsValue = string | number | boolean

const MAX_STRING_LENGTH = 64

/**
 * Last line of defence before an event leaves the device: keep only the
 * properties the schema declares, and only primitive values — an object, an
 * array or an over-long string is the shape a leak would take, so it is
 * dropped rather than trimmed into something plausible.
 */
export function sanitizeAnalyticsProperties(
  event: string,
  properties: Record<string, unknown> = {},
): Record<string, AnalyticsValue> {
  if (!isAnalyticsEventName(event)) return {}
  const allowed: readonly string[] = ANALYTICS_EVENT_PROPERTIES[event]
  const clean: Record<string, AnalyticsValue> = {}
  for (const key of allowed) {
    const value = properties[key]
    if (typeof value === 'boolean') clean[key] = value
    else if (typeof value === 'number') {
      if (Number.isFinite(value)) clean[key] = value
    } else if (typeof value === 'string') {
      if (value.length > 0 && value.length <= MAX_STRING_LENGTH) clean[key] = value
    }
  }
  return clean
}
