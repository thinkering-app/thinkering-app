import { fetch } from 'expo/fetch'
import {
  accumulateEvent,
  latencyBucket,
  emptyAccumulator,
  extractJsonText,
  fixtureDocForGoal,
  getPromptTemplate,
  MODEL_IDS,
  modelRequestFields,
  parseActivityDoc,
  RECORDED_RESPONSES,
  SEARCH_DEADLINE_MS,
  serverToolError,
  SseParser,
  type AnyPromptTemplate,
  type RenderedPrompt,
} from '@thinkering/core'
import { logLlmCall } from '@thinkering/db'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { signedHeaders } from './device'
import { KEYS, secureGet } from './secure-store'
import { API_BASE_URL, getAiMode, type AiMode } from './settings'

/**
 * The one way the app talks to a model (docs/02 §AI access, docs/04): same
 * prompt code in all three modes — proxy (server renders), BYO key (rendered
 * here, direct call), fixture (recorded responses, simulated streaming). One
 * retry on transient failure; one repair round-trip on schema-invalid output;
 * every call logged to llm_calls for the AI Inspector. Unvalidated output
 * never leaves this module.
 */

export class AiBudgetError extends Error {
  constructor(public resetAt: string) {
    super('daily generation budget used')
    this.name = 'AiBudgetError'
  }
}

export class AiOutputError extends Error {
  constructor(public issues: string[]) {
    super('model output failed validation')
    this.name = 'AiOutputError'
  }
}

/**
 * The proxy doesn't know a kind this build sends: this install is older than
 * the deployment (docs/04 §Retired kinds). Retrying never helps and the app
 * can't fix itself — there is no OTA — so it's worth its own error and its own
 * sentence rather than the generic failure.
 */
export class AiOutdatedClientError extends Error {
  constructor() {
    super('proxy does not know this kind')
    this.name = 'AiOutdatedClientError'
  }
}

export interface AiCallOptions {
  interestId?: string
  activityId?: string
  signal?: AbortSignal
  /** Accumulated raw text so far — feed extractPartialActivityDoc for G5b. */
  onText?: (text: string) => void
  mode?: AiMode
}

export interface AiCallResult<T = unknown> {
  output: T
  rawText: string
  model: string
  usage: { inputTokens: number; outputTokens: number }
  latencyMs: number
}

interface Repair {
  previousText: string
  issues: string[]
}

interface Execution {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
}

const TRANSIENT = new Set([408, 429, 500, 502, 503, 504, 529])

/** The logged reason a call stopped at the daily cap — also what `ai_call` reports. */
const RATE_LIMITED = 'daily generation budget used'

/** The proxy's wire code for a generation whose web search failed. */
const SEARCH_UNAVAILABLE = 'search_unavailable'

/** The proxy's wire code for a kind it has no template for. */
const UNKNOWN_KIND = 'unknown_kind'

/**
 * A generation whose web search didn't run: either the proxy said so
 * (`search_unavailable`), or a searching kind came back unusable, which for
 * those kinds means the same thing — the model narrates the outage rather than
 * answering. Marked on whichever error the failure produced, the way
 * `transient` is, so the logging path doesn't change; `describeAiError` reads
 * it to tell the learner it was the search and not their path.
 */
export function markSearchFailed<E extends Error>(error: E): E {
  return Object.assign(error, { searchFailed: true })
}

export function isSearchFailure(error: unknown): boolean {
  return (error as { searchFailed?: boolean } | null)?.searchFailed === true
}

export async function callAi<T = unknown>(
  kind: string,
  params: unknown,
  opts: AiCallOptions = {},
): Promise<AiCallResult<T>> {
  const template = getPromptTemplate(kind)
  if (!template) throw new Error(`unknown generation kind "${kind}"`)
  const parsedParams = template.paramsSchema.parse(params)
  const mode = opts.mode ?? getAiMode()
  const rendered = template.render(parsedParams as never)
  const started = Date.now()

  const logCall = (
    status: 'ok' | 'error' | 'aborted',
    latencyMs: number,
    execution?: Execution,
    error?: string,
  ) => {
    logLlmCall(db, repoContext, {
      kind,
      model: execution?.model ?? MODEL_IDS[template.model],
      interestId: opts.interestId ?? null,
      activityId: opts.activityId ?? null,
      request: rendered,
      response: execution ? { text: execution.text } : null,
      inputTokens: execution?.inputTokens ?? null,
      outputTokens: execution?.outputTokens ?? null,
      latencyMs,
      status,
      error: error ?? null,
    })
  }

  const finishLog = (status: 'ok' | 'error' | 'aborted', execution?: Execution, error?: string) => {
    const latencyMs = Date.now() - started
    // `ai_call` (docs/08) counts kinds and latency buckets, never the prompt or
    // the output. An aborted call is a navigation, not a result, so it doesn't
    // count; fixture mode isn't a real call either. One event per call, so a
    // repaired call is one `ai_call` even though it logs two rows locally.
    if (status !== 'aborted' && mode !== 'fixture') {
      track('ai_call', {
        kind,
        model: execution?.model ?? MODEL_IDS[template.model],
        latency_bucket: latencyBucket(latencyMs),
        status: status === 'ok' ? 'ok' : error === RATE_LIMITED ? 'rate_limited' : 'error',
      })
    }
    logCall(status, latencyMs, execution, error)
  }

  try {
    let execution = await executeWithRetry(
      mode,
      kind,
      template,
      parsedParams,
      rendered,
      undefined,
      opts,
    )
    let validated = validateOutput(kind, template, parsedParams, execution.text)

    if (!validated.ok) {
      // A kind that searches the web doesn't get a repair. Invalid output from
      // one of those is rarely malformed JSON — it's the model narrating that
      // the search failed — and repairing runs the same searches into the same
      // outage, at the price of the most expensive call the app makes (docs/04).
      if (template.tools?.webSearch) {
        finishLog('error', execution, `invalid output: ${validated.issues.slice(0, 3).join('; ')}`)
        throw markSearchFailed(new AiOutputError(validated.issues))
      }
      // The failed attempt gets its own row before the repair overwrites it:
      // the model was paid for it, so an Inspector that showed only the repair
      // would report the call as costing half what it did.
      logCall(
        'error',
        Date.now() - started,
        execution,
        `invalid output, repaired: ${validated.issues.slice(0, 3).join('; ')}`,
      )
      // One repair round-trip: send the validation errors back (docs/04).
      execution = await executeWithRetry(
        mode,
        kind,
        template,
        parsedParams,
        rendered,
        {
          previousText: execution.text,
          issues: validated.issues,
        },
        opts,
      )
      validated = validateOutput(kind, template, parsedParams, execution.text)
      if (!validated.ok) {
        finishLog('error', execution, `invalid output: ${validated.issues.slice(0, 3).join('; ')}`)
        throw new AiOutputError(validated.issues)
      }
    }

    finishLog('ok', execution)
    return {
      output: validated.output as T,
      rawText: execution.text,
      model: execution.model,
      usage: { inputTokens: execution.inputTokens, outputTokens: execution.outputTokens },
      latencyMs: Date.now() - started,
    }
  } catch (e) {
    if (e instanceof AiOutputError) throw e
    if (opts.signal?.aborted) {
      finishLog('aborted')
    } else if (e instanceof AiBudgetError) {
      finishLog('error', undefined, RATE_LIMITED)
      track('cap_reached')
    } else {
      finishLog('error', undefined, (e as Error).message)
    }
    throw e
  }
}

function validateOutput(
  kind: string,
  template: AnyPromptTemplate,
  params: unknown,
  text: string,
): { ok: true; output: unknown } | { ok: false; issues: string[] } {
  if (kind === 'activity.generate') {
    const goal = (params as { goal?: { concepts?: { id: string }[] } }).goal
    const result = parseActivityDoc(text, {
      goalConceptIds: goal?.concepts?.map((c) => c.id) ?? [],
    })
    return result.ok
      ? { ok: true, output: result.doc }
      : { ok: false, issues: result.issues.map((i) => `${i.path}: ${i.message}`) }
  }
  let json: unknown
  try {
    json = JSON.parse(extractJsonText(text))
  } catch (e) {
    return { ok: false, issues: [`invalid JSON: ${(e as Error).message}`] }
  }
  const parsed = template.outputSchema.safeParse(json)
  return parsed.success
    ? { ok: true, output: parsed.data }
    : { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
}

async function executeWithRetry(
  mode: AiMode,
  kind: string,
  template: AnyPromptTemplate,
  params: unknown,
  rendered: RenderedPrompt,
  repair: Repair | undefined,
  opts: AiCallOptions,
): Promise<Execution> {
  try {
    return await executeOnce(mode, kind, template, params, rendered, repair, opts)
  } catch (e) {
    const retryable =
      !(e instanceof AiBudgetError) &&
      !opts.signal?.aborted &&
      (e as { transient?: boolean }).transient === true
    if (!retryable) throw e
    return executeOnce(mode, kind, template, params, rendered, repair, opts)
  }
}

async function executeOnce(
  mode: AiMode,
  kind: string,
  template: AnyPromptTemplate,
  params: unknown,
  rendered: RenderedPrompt,
  repair: Repair | undefined,
  opts: AiCallOptions,
): Promise<Execution> {
  if (mode === 'fixture') return fixtureCall(kind, params, opts)
  if (mode === 'byok') return byokCall(template, rendered, repair, opts)
  return proxyCall(kind, params, repair, opts)
}

// ── fixture mode ─────────────────────────────────────────────────────────────

async function fixtureCall(kind: string, params: unknown, opts: AiCallOptions): Promise<Execution> {
  let text: string
  if (kind === 'activity.generate') {
    const { tier, goal } = params as {
      tier: 'introduce' | 'strengthen' | 'apply'
      goal: { concepts: { id: string; label: string }[] }
    }
    text = JSON.stringify(fixtureDocForGoal(tier, goal.concepts))
  } else {
    const recorded = RECORDED_RESPONSES[kind]
    if (!recorded)
      throw new Error(
        `no recorded fixture for kind "${kind}" — run pnpm prompt:run ${kind} --record`,
      )
    text = recorded.text
  }

  if (opts.onText) {
    // Simulated streaming so streaming UI paths run for real.
    let sent = ''
    for (let i = 0; i < text.length; i += 120) {
      if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      sent = text.slice(0, i + 120)
      opts.onText(sent)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  return { text, model: 'fixture', inputTokens: 0, outputTokens: 0 }
}

// ── proxy mode ───────────────────────────────────────────────────────────────

async function proxyCall(
  kind: string,
  params: unknown,
  repair: Repair | undefined,
  opts: AiCallOptions,
): Promise<Execution> {
  const body = JSON.stringify({ kind, params, stream: true, ...(repair ? { repair } : {}) })
  const res = await fetch(`${API_BASE_URL}/api/ai`, {
    method: 'POST',
    headers: await signedHeaders(body),
    body,
    signal: opts.signal ?? null,
  })

  if (res.status === 429) {
    const payload = (await res.json()) as { resetAt?: string }
    throw new AiBudgetError(payload.resetAt ?? '')
  }
  if (!res.ok) {
    const body = await res.text()
    // The proxy renders from its own registry, so a kind it rejects means this
    // build predates the deployment. Nothing here can fix that.
    if (res.status === 400 && body.includes(UNKNOWN_KIND)) throw new AiOutdatedClientError()
    // A failed web search answers 502, which is otherwise retryable; retrying
    // runs the searches again into the same outage (see consumeSse).
    const searchFailed = body.includes(SEARCH_UNAVAILABLE)
    const error = new Error(
      searchFailed ? 'web search unavailable' : `proxy error ${res.status}`,
    ) as Error & { transient?: boolean }
    error.transient = !searchFailed && TRANSIENT.has(res.status)
    throw searchFailed ? markSearchFailed(error) : error
  }
  return consumeSse(res, opts)
}

// ── BYO key mode ─────────────────────────────────────────────────────────────

async function byokCall(
  template: AnyPromptTemplate,
  rendered: RenderedPrompt,
  repair: Repair | undefined,
  opts: AiCallOptions,
): Promise<Execution> {
  const apiKey = await secureGet(KEYS.byokKey)
  if (!apiKey) throw new Error('no Anthropic key saved — add one in Me → Settings → AI')

  const messages: { role: 'user' | 'assistant'; content: string }[] = rendered.messages.map(
    (m) => ({
      role: m.role,
      content: m.content,
    }),
  )
  if (repair) {
    messages.push(
      { role: 'assistant', content: repair.previousText },
      {
        role: 'user',
        content: `That response failed validation:\n${repair.issues.map((i) => `- ${i}`).join('\n')}\nRe-emit the complete corrected JSON object only.`,
      },
    )
  }

  // A searching call stops at the proxy's deadline here too: it is the
  // learner's own key paying for a search that has stalled (docs/04).
  const deadline = new AbortController()
  let timedOut = false
  const timer = template.tools?.webSearch
    ? setTimeout(() => {
        timedOut = true
        deadline.abort()
      }, SEARCH_DEADLINE_MS)
    : undefined
  const forwardAbort = () => deadline.abort()
  opts.signal?.addEventListener('abort', forwardAbort)
  if (opts.signal?.aborted) deadline.abort()
  try {
    return await byokStream(template, rendered, messages, apiKey, deadline.signal, opts)
  } catch (e) {
    if (!timedOut) throw e
    throw markSearchFailed(new Error('web search stopped at its deadline'))
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', forwardAbort)
  }
}

async function byokStream(
  template: AnyPromptTemplate,
  rendered: RenderedPrompt,
  messages: { role: 'user' | 'assistant'; content: string }[],
  apiKey: string,
  signal: AbortSignal,
  opts: AiCallOptions,
): Promise<Execution> {
  // Direct REST call: the Anthropic SDK's streaming path needs runtime pieces
  // React Native doesn't reliably provide; expo/fetch gives us the same SSE.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      // Model, limits, thinking, sampling and tools — the same fields the
      // proxy sends (packages/core/src/prompts/request.ts).
      ...modelRequestFields(template),
      system: rendered.system.map((b) => ({
        type: 'text',
        text: b.text,
        ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
      })),
      messages,
      stream: true,
    }),
    signal,
  })

  if (!res.ok) {
    const error = new Error(`anthropic error ${res.status}`) as Error & { transient?: boolean }
    error.transient = TRANSIENT.has(res.status)
    throw error
  }
  return consumeSse(res, opts)
}

// ── shared SSE consumption ───────────────────────────────────────────────────

async function consumeSse(res: Response, opts: AiCallOptions): Promise<Execution> {
  if (!res.body) throw new Error('no response stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const parser = new SseParser()
  let acc = emptyAccumulator()
  let model = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    for (const event of parser.push(decoder.decode(value, { stream: true }))) {
      if (event.event === 'proxy_error') {
        // `search_unavailable` (apps/web/app/api/ai/route.ts) is the proxy
        // saying the web search itself failed. Retrying runs the searches
        // again into the same outage, so it is the one stream error that is
        // not transient.
        const searchFailed = event.data.includes(SEARCH_UNAVAILABLE)
        const error = new Error(
          searchFailed ? 'web search unavailable' : 'upstream stream error',
        ) as Error & { transient?: boolean }
        error.transient = !searchFailed
        throw searchFailed ? markSearchFailed(error) : error
      }
      let data: unknown = {}
      try {
        data = JSON.parse(event.data)
      } catch {
        // ignore malformed frames
      }
      if (event.event === 'message_start') {
        model = (data as { message?: { model?: string } }).message?.model ?? model
      }
      // The first failed search ends the call, as in the proxy: the model
      // would otherwise keep searching into the same error on the learner's
      // budget. Cancelling the read closes the connection, which stops it.
      if (event.event === 'content_block_start') {
        const code = serverToolError((data as { content_block?: unknown }).content_block)
        if (code !== undefined) {
          void reader.cancel()
          throw markSearchFailed(new Error(`web search failed: ${code}`))
        }
      }
      const next = accumulateEvent(acc, event.event, data)
      if (next.text !== acc.text && opts.onText) opts.onText(next.text)
      acc = next
    }
  }

  return {
    text: acc.text,
    model: model || 'unknown',
    inputTokens: acc.inputTokens,
    outputTokens: acc.outputTokens,
  }
}
