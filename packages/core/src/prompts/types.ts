import type { z } from 'zod'

/**
 * Prompt infrastructure (docs/04). Every LLM call has a `kind`, a versioned
 * template here, a Zod output schema, and a row in the local `llm_calls` table.
 * Templates are typed functions returning {system, messages} — no string soup.
 */

export const GENERATION_KINDS = [
  'intake.approach', // G1
  'intake.choices', // G2
  'intake.path', // G3
  'resources.search', // G4
  'today.plan', // G5a
  'activity.generate', // G5b
  'activity.review', // G6
  'activity.question', // G7
  'reflect.open', // G8a
  'reflect.update', // G8
  'path.suggestGoals', // G9
  'resource.describe', // G10
  'routine.customize', // G11
] as const
export type GenerationKind = (typeof GENERATION_KINDS)[number]

/** Right-size models per kind (D11). Ids live in this one map — easy to tune. */
export type PromptModel = 'sonnet' | 'haiku'
export const MODEL_IDS: Record<PromptModel, string> = {
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-haiku-4-5',
}

export interface SystemBlock {
  text: string
  /** Prompt-cache breakpoint (`cache_control: ephemeral`) sits on this block. */
  cache?: boolean
}

export interface PromptMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RenderedPrompt {
  system: SystemBlock[]
  messages: PromptMessage[]
}

/**
 * Anthropic server-side tools a kind runs with (docs/04). Declared abstractly
 * here and mapped to the wire shape by `modelRequestFields` (./request.ts).
 */
export interface PromptTools {
  webSearch?: { maxUses: number }
}

export interface PromptTemplate<TParams, TOutput> {
  kind: GenerationKind
  /** Recorded in llm_calls as PROMPT_VERSION; bump on any render change. */
  version: number
  model: PromptModel
  /** Thinking and output together — leave thinking room on Sonnet kinds. */
  maxTokens: number
  /**
   * Only meaningful on haiku kinds: Sonnet 5 rejects sampling parameters
   * (temperature/top_p/top_k) — callers must omit temperature for sonnet.
   */
  temperature?: number
  /** Sonnet kinds only, and required there (asserted in prompts.test.ts). */
  effort?: PromptEffort
  /** Only G4 uses these today: reputable-source search needs the live web. */
  tools?: PromptTools
  paramsSchema: z.ZodType<TParams>
  outputSchema: z.ZodType<TOutput>
  render: (params: TParams) => RenderedPrompt
}

/**
 * How hard a Sonnet kind thinks (docs/04 §Thinking). Sonnet 5 thinks by
 * default, the thinking shares `maxTokens`, and nothing streams until it's
 * done — so every Sonnet kind states its level rather than inheriting one.
 */
export type PromptEffort = 'low' | 'medium' | 'high'

/** Existentially-typed view for registry consumers (proxy, client wrapper). */
export type AnyPromptTemplate = PromptTemplate<never, unknown> & {
  paramsSchema: z.ZodType<unknown>
  render: (params: never) => RenderedPrompt
}
