import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type {
  ActivityDoc,
  ActivityStatus,
  ContextKind,
  ExperienceChoice,
  Frequency,
  GoalConcept,
  GoalSource,
  GoalStatus,
  InterestStatus,
  Rating,
  ResourceSource,
  Section,
  Tier,
  TopicOrigin,
  WhyChoice,
} from '@thinkering/core'

/**
 * SQLite schema per docs/03-data-model.md. Conventions: `id` = client-generated
 * UUIDv7; timestamps epoch ms UTC; synced tables carry `updated_at` + `deleted_at`
 * (soft delete — never hard-delete synced rows). JSON columns hold Zod-validated
 * payloads typed via `$type`.
 */

const id = () => text('id').primaryKey()
const createdAt = () => integer('created_at').notNull()
const updatedAt = () => integer('updated_at').notNull()
const deletedAt = () => integer('deleted_at')

// ── interests ⟳ ─────────────────────────────────────────────────────────────

export const interests = sqliteTable('interests', {
  id: id(),
  name: text('name').notNull(),
  wantToLearn: text('want_to_learn').notNull(),
  whyChoice: text('why_choice').$type<WhyChoice>().notNull(),
  whyText: text('why_text'),
  experienceChoice: text('experience_choice').$type<ExperienceChoice>().notNull(),
  experienceText: text('experience_text'),
  frequency: text('frequency').$type<Frequency>().notNull(),
  sessionMinutes: integer('session_minutes').notNull(),
  approachNotes: text('approach_notes').notNull().default(''),
  status: text('status').$type<InterestStatus>().notNull(),
  sortOrder: real('sort_order').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
})

// ── topics ⟳ — intake topic chips + later additions ─────────────────────────

export const topics = sqliteTable(
  'topics',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    label: text('label').notNull(),
    origin: text('origin').$type<TopicOrigin>().notNull(),
    selected: integer('selected', { mode: 'boolean' }).notNull(),
    sortOrder: real('sort_order').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('topics_interest_idx').on(t.interestId)],
)

// ── goals ⟳ ─────────────────────────────────────────────────────────────────

export const goals = sqliteTable(
  'goals',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    /** Key concepts/skills beneath this goal (D16); ids stable for activity references. */
    concepts: text('concepts', { mode: 'json' }).$type<GoalConcept[]>().notNull(),
    status: text('status').$type<GoalStatus>().notNull().default('not_started'),
    sortOrder: real('sort_order').notNull(),
    source: text('source').$type<GoalSource>().notNull(),
    introducedAt: integer('introduced_at'),
    strengthenedAt: integer('strengthened_at'),
    appliedAt: integer('applied_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('goals_interest_idx').on(t.interestId)],
)

// ── activities ⟳ ────────────────────────────────────────────────────────────

export const activities = sqliteTable(
  'activities',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    goalId: text('goal_id').references(() => goals.id),
    /** Set only on the strengthen prerequisite-fallback card, which has no goal yet (docs/01 §3). */
    topic: text('topic'),
    section: text('section').$type<Section>().notNull(),
    tier: text('tier').$type<Tier>().notNull(),
    libraryItemId: text('library_item_id').notNull(),
    title: text('title').notNull(),
    estMinutes: integer('est_minutes').notNull(),
    /** Activity Document; null until G5b generates content. */
    doc: text('doc', { mode: 'json' }).$type<ActivityDoc>(),
    status: text('status').$type<ActivityStatus>().notNull().default('planned'),
    currentPage: integer('current_page').notNull().default(0),
    /** Local date YYYY-MM-DD the scheduler planned it for. */
    plannedFor: text('planned_for').notNull(),
    startedAt: integer('started_at'),
    completedAt: integer('completed_at'),
    rating: text('rating').$type<Rating>(),
    ratingText: text('rating_text'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    // History = completed activities (docs/03).
    index('activities_history_idx').on(t.interestId, t.completedAt),
    index('activities_planned_idx').on(t.interestId, t.plannedFor),
  ],
)

// ── responses ⟳ — user answers inside activities ────────────────────────────

export const responses = sqliteTable(
  'responses',
  {
    id: id(),
    activityId: text('activity_id')
      .notNull()
      .references(() => activities.id),
    pageId: text('page_id').notNull(),
    blockId: text('block_id').notNull(),
    /** Typed per block kind; validated at the boundary that writes it. */
    payload: text('payload', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('responses_activity_idx').on(t.activityId)],
)

// ── resources ⟳ ─────────────────────────────────────────────────────────────

export const resources = sqliteTable(
  'resources',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    url: text('url').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    howToUse: text('how_to_use'),
    /** For generation context; not shown in UI. */
    summary: text('summary'),
    source: text('source').$type<ResourceSource>().notNull(),
    goalIds: text('goal_ids', { mode: 'json' }).$type<string[]>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('resources_interest_idx').on(t.interestId)],
)

// ── contexts ⟳ — projects/environments/people (path settings) ───────────────

export const contexts = sqliteTable(
  'contexts',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    kind: text('kind').$type<ContextKind>().notNull(),
    label: text('label').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('contexts_interest_idx').on(t.interestId)],
)

// ── reflections ⟳ ───────────────────────────────────────────────────────────

export const reflections = sqliteTable(
  'reflections',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    feelingText: text('feeling_text').notNull(),
    /** Accepted path edits summary. */
    changes: text('changes', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('reflections_interest_idx').on(t.interestId)],
)

// ── library_prefs ⟳ — per-interest activation of library items ──────────────
// Absent row = library item's default activation. Definitions live in code.

export const libraryPrefs = sqliteTable(
  'library_prefs',
  {
    id: id(),
    interestId: text('interest_id')
      .notNull()
      .references(() => interests.id),
    section: text('section').$type<Section>().notNull(),
    libraryItemId: text('library_item_id').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('library_prefs_interest_idx').on(t.interestId)],
)

// ── routine_notes ⟳ — free-text routine customization (G11) ─────────────────

export const routineNotes = sqliteTable('routine_notes', {
  id: id(),
  /** Null = global. */
  interestId: text('interest_id').references(() => interests.id),
  note: text('note').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
})

// ── gen_cache — local only ──────────────────────────────────────────────────

export const genCache = sqliteTable(
  'gen_cache',
  {
    id: id(),
    kind: text('kind').notNull(),
    /** E.g. interest_id + local date. */
    scopeKey: text('scope_key').notNull(),
    payload: text('payload', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: createdAt(),
    expiresAt: integer('expires_at'),
  },
  (t) => [index('gen_cache_scope_idx').on(t.kind, t.scopeKey)],
)

// ── llm_calls — local only, for the AI Inspector ────────────────────────────
// Pruned to last ~200 calls. Never synced.

export const llmCalls = sqliteTable('llm_calls', {
  id: id(),
  kind: text('kind').notNull(),
  model: text('model').notNull(),
  interestId: text('interest_id'),
  activityId: text('activity_id'),
  /** Rendered messages/system. */
  request: text('request', { mode: 'json' }).$type<unknown>().notNull(),
  response: text('response', { mode: 'json' }).$type<unknown>(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  status: text('status').$type<'ok' | 'error' | 'aborted'>().notNull(),
  error: text('error'),
  createdAt: createdAt(),
})

// ── analytics_buffer — local only (D9 pre-consent buffer) ───────────────────
// Capped (~7 days / ~300 events). Never synced.

export const analyticsBuffer = sqliteTable('analytics_buffer', {
  id: id(),
  event: text('event').notNull(),
  properties: text('properties', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
})

// ── settings — local key/value ──────────────────────────────────────────────

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
})

/** Tables mirrored to Supabase when backup is on (docs/03 ⟳ markers). */
export const SYNCED_TABLES = {
  interests,
  topics,
  goals,
  activities,
  responses,
  resources,
  contexts,
  reflections,
  library_prefs: libraryPrefs,
  routine_notes: routineNotes,
} as const
