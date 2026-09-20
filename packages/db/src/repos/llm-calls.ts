import { weightedTokens } from '@thinkering/core'
import { desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { Database, RepoContext } from '../database'
import { llmCalls } from '../schema'

export type LlmCall = typeof llmCalls.$inferSelect

const KEEP_CALLS = 200

export interface NewLlmCall {
  kind: string
  model: string
  interestId?: string | null
  activityId?: string | null
  /** Rendered {system, messages} — local only, for the AI Inspector. */
  request: unknown
  response?: unknown
  inputTokens?: number | null
  outputTokens?: number | null
  latencyMs?: number | null
  status: 'ok' | 'error' | 'aborted'
  error?: string | null
}

/** Records a call for the AI Inspector and prunes to the last ~200 (docs/03). */
export function logLlmCall(db: Database, ctx: RepoContext, input: NewLlmCall): string {
  const id = ctx.newId()
  db.insert(llmCalls)
    .values({
      id,
      kind: input.kind,
      model: input.model,
      interestId: input.interestId ?? null,
      activityId: input.activityId ?? null,
      request: input.request,
      response: input.response ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
      status: input.status,
      error: input.error ?? null,
      createdAt: ctx.now(),
    })
    .run()

  const cutoff = db
    .select({ id: llmCalls.id, createdAt: llmCalls.createdAt })
    .from(llmCalls)
    .orderBy(desc(llmCalls.createdAt), desc(llmCalls.id))
    .limit(1)
    .offset(KEEP_CALLS - 1)
    .get()
  if (cutoff) {
    db.delete(llmCalls).where(lt(llmCalls.createdAt, cutoff.createdAt)).run()
    // Same-timestamp stragglers beyond the cutoff row are fine to keep.
  }
  return id
}

export function listLlmCalls(db: Database, limit = 100): LlmCall[] {
  return db
    .select()
    .from(llmCalls)
    .orderBy(desc(llmCalls.createdAt), desc(llmCalls.id))
    .limit(limit)
    .all()
}

export function getLlmCall(db: Database, id: string): LlmCall | undefined {
  return db.select().from(llmCalls).where(eq(llmCalls.id, id)).get()
}

/** One kind's share of a window's spend, for the AI Inspector's totals. */
export interface LlmKindTotal {
  kind: string
  calls: number
  inputTokens: number
  outputTokens: number
  /**
   * Calls that reported no token counts and so contribute nothing to the sums
   * — an aborted stream never reaches `message_delta`, though the proxy still
   * charges what it streamed. What makes these totals a floor rather than the
   * meter (docs/04 §Usage metering).
   */
  unreported: number
}

/**
 * What each kind has spent since `sinceMs`, heaviest first. The Inspector's
 * per-call list answers "what did this prompt send"; this answers "where is
 * the budget going", which is the question a long testing day raises.
 *
 * A floor, not the meter: a call that reported no tokens counts toward `calls`
 * and `unreported` but adds nothing to the sums, so a day with aborted streams
 * in it reads lower here than in Me → Settings → AI.
 *
 * Heaviest is in weighted tokens, the unit the daily cap uses and the one the
 * panel displays — sorting on output alone would put an input-heavy kind below
 * a cheaper one.
 */
export function llmCallTotals(db: Database, sinceMs: number): LlmKindTotal[] {
  return db
    .select({
      kind: llmCalls.kind,
      calls: sql<number>`count(*)`,
      inputTokens: sql<number>`coalesce(sum(${llmCalls.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${llmCalls.outputTokens}), 0)`,
      unreported: sql<number>`sum(case when ${llmCalls.outputTokens} is null then 1 else 0 end)`,
    })
    .from(llmCalls)
    .where(gte(llmCalls.createdAt, sinceMs))
    .groupBy(llmCalls.kind)
    .all()
    .sort(
      (a, b) =>
        weightedTokens(b.inputTokens, b.outputTokens) -
        weightedTokens(a.inputTokens, a.outputTokens),
    )
}
