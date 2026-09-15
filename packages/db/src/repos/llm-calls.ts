import { desc, eq, lt } from 'drizzle-orm'
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
  return db.select().from(llmCalls).orderBy(desc(llmCalls.createdAt), desc(llmCalls.id)).limit(limit).all()
}

export function getLlmCall(db: Database, id: string): LlmCall | undefined {
  return db.select().from(llmCalls).where(eq(llmCalls.id, id)).get()
}
