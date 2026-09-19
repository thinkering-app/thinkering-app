import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  getPromptTemplate,
  LANGUAGES,
  modelRequestFields,
  renderPrompt,
  SEARCH_DEADLINE_MS,
  serverToolError,
  type RenderedPrompt,
} from '@thinkering/core'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import {
  budgetHeaders,
  checkBudget,
  nextUtcMidnight,
  REPAIR_COUNTER,
  reverseDelta,
  utcDayOf,
  withoutDelta,
} from '@/lib/server/metering'
import { alertOnSpend } from '@/lib/server/spend-alert'
import type { UsageDelta } from '@/lib/server/store'

/**
 * The AI proxy (docs/02 §AI access, docs/04). The client sends {kind, params},
 * never raw prompts — the server renders the same packages/core template and
 * streams Anthropic's SSE back. Prompt and response bodies are never logged.
 */

export const maxDuration = 300

/** Generous: English runs near 4 characters a token, and JSON escaping adds a little. */
const MAX_CHARS_PER_TOKEN = 6

/**
 * Refused before it is hashed or parsed. Params are bounded field by field
 * (packages/core/src/limits.ts), but lists aren't, and a learner with every
 * resource they've saved in the context sends a few hundred KB at most.
 */
export const MAX_BODY_CHARS = 1_000_000

/**
 * Charging a cancelled stream (docs/04 §Usage metering). The real output count
 * arrives only in `message_delta`, at the end, so a call the client walked away
 * from has to be charged from what actually reached us. Deliberately low —
 * overestimating tokens is the safe direction, and either way it beats the
 * reservation, which runs several times a finished call.
 */
const CHARS_PER_OUTPUT_TOKEN = 3

/**
 * Wire code for a generation whose web search failed, matched by name in the
 * mobile client (`apps/mobile/src/ai/client.ts`). Distinct from
 * `upstream_error` because the client must not retry it.
 */
const SEARCH_UNAVAILABLE = 'search_unavailable'

function toolErrorOf(blocks: readonly unknown[]): string | undefined {
  for (const block of blocks) {
    const code = serverToolError(block)
    if (code !== undefined) return code
  }
  return undefined
}

/** Named so `settle` records it as its own error type rather than a generic one. */
function toolFailure(code: string): Error {
  const error = new Error(`server tool failed: ${code}`)
  error.name = `search:${code}`
  return error
}

const bodySchema = z.object({
  // Bounded because an unknown kind gets logged: every real kind is well under
  // this, and it keeps a client from writing arbitrary length into our logs.
  kind: z.string().min(1).max(64),
  params: z.unknown(),
  stream: z.boolean().optional().default(true),
  /** The language to write in (docs/04 §Content language). Builds before it send none. */
  language: z.enum(LANGUAGES).optional().default('en'),
  /** One repair round-trip (docs/04 §Failure handling): the client sends back
   * the invalid output + validation errors; we append them as extra turns. */
  repair: z
    .object({
      previousText: z.string().max(100_000),
      issues: z.array(z.string().max(500)).min(1).max(20),
    })
    .optional(),
})

function toAnthropicRequest(
  template: NonNullable<ReturnType<typeof getPromptTemplate>>,
  rendered: RenderedPrompt,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    // Model, limits, thinking, sampling and tools, shared with the BYO-key
    // client and the prompt scripts (packages/core/src/prompts/request.ts).
    ...(modelRequestFields(template) as Omit<
      Anthropic.MessageCreateParamsNonStreaming,
      'messages'
    >),
    system: rendered.system.map((b) => ({
      type: 'text' as const,
      text: b.text,
      ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
    })),
    messages: rendered.messages.map((m) => ({ role: m.role, content: m.content })),
  }
}

export async function POST(req: Request): Promise<Response> {
  const { store, anthropic, now, logAiCall } = getDeps()

  const bodyText = await req.text()
  if (bodyText.length > MAX_BODY_CHARS) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }
  const auth = await verifyDeviceAuth(req, bodyText, store, now())
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status })

  // Client-supplied and unsigned, so it's a diagnostic rather than a claim:
  // nothing branches on it. Builds older than the header report 'unknown'.
  const appVersion = (req.headers.get('x-app-version') ?? 'unknown').slice(0, 32)

  let json: unknown
  try {
    json = JSON.parse(bodyText)
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const body = bodySchema.safeParse(json)
  if (!body.success) {
    return Response.json({ error: 'invalid_request', issues: body.error.issues }, { status: 400 })
  }

  const template = getPromptTemplate(body.data.kind)
  if (!template) {
    // Logged because it is otherwise invisible: this returns before the
    // reservation, so a kind we've dropped leaves no row in device_usage and
    // an install too old to know better fails with nothing to debug from
    // (docs/04 §Retired kinds). The kind is client-supplied — bounded by
    // `bodySchema` above, and JSON-encoded by `logAiCall`, so it stays one
    // field rather than becoming a log line of its own.
    logAiCall({
      kind: body.data.kind,
      model: 'none',
      status: 'error',
      errorType: 'unknown_kind',
      appVersion,
    })
    return Response.json({ error: 'unknown_kind' }, { status: 400 })
  }

  // The text being repaired is the model's own earlier output, so it can't be
  // longer than a response of this kind; anything past that isn't a repair.
  if (
    body.data.repair &&
    body.data.repair.previousText.length > template.maxTokens * MAX_CHARS_PER_TOKEN
  ) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const params = template.paramsSchema.safeParse(body.data.params)
  if (!params.success) {
    return Response.json({ error: 'invalid_params', issues: params.error.issues }, { status: 400 })
  }

  const rendered = renderPrompt(template, params.data, body.data.language)
  if (body.data.repair) {
    rendered.messages = [
      ...rendered.messages,
      { role: 'assistant', content: body.data.repair.previousText },
      {
        role: 'user',
        content: `That response failed validation:\n${body.data.repair.issues.map((i) => `- ${i}`).join('\n')}\nRe-emit the complete corrected JSON object only.`,
      },
    ]
  }
  const request = toAnthropicRequest(template, rendered)
  const model = request.model

  // Reserve before calling: the call is counted and its most expensive outcome
  // held against the budget up front, so parallel requests see each other.
  // Settling afterwards swaps the held output for the real count.
  const day = utcDayOf(now())
  const reservedOutput = request.max_tokens
  const reservation: UsageDelta = {
    counters: body.data.repair ? [template.kind, REPAIR_COUNTER] : [template.kind],
    calls: 1,
    inputTokens: 0,
    outputTokens: reservedOutput,
  }
  const before = withoutDelta(await store.addUsage(auth.deviceId, day, reservation), reservation)
  const headers = budgetHeaders(before.device, now(), before.bonusWeighted)
  const decision = checkBudget(template.kind, before.device, {
    repair: body.data.repair !== undefined,
    total: before.total,
    bonusWeighted: before.bonusWeighted,
  })
  if (!decision.allowed) {
    await store.addUsage(auth.deviceId, day, reverseDelta(reservation))
    if (decision.reason === 'service_limit_reached') await alertOnSpend(day, before.total)
    return Response.json(
      { error: decision.reason, resetAt: nextUtcMidnight(now()) },
      { status: 429, headers },
    )
  }

  const searches = template.tools?.webSearch !== undefined
  /** Stops a searching call at `SEARCH_DEADLINE_MS`; cleared when the call settles. */
  const deadline = new AbortController()
  let timedOut = false
  const deadlineTimer = searches
    ? setTimeout(() => {
        timedOut = true
        deadline.abort()
      }, SEARCH_DEADLINE_MS)
    : undefined
  /**
   * The SDK retries 429s and 5xxs twice by default. On a kind that searches
   * the web that turns one rate-limited call into three, each running its own
   * searches and each billed — and the thing being rate limited is usually the
   * search, so the retries fail the same way. These kinds surface the failure
   * instead (docs/04 §Usage metering).
   */
  const requestOptions = searches ? { maxRetries: 0, signal: deadline.signal } : {}

  const started = now()
  let settled = false
  /**
   * Records the call once, whichever way it ends. `outputTokens` undefined
   * means we never got a real count: `fallback` is then the charge, defaulting
   * to the reservation because the model may have generated tokens we lost.
   */
  const settle = async (
    inputTokens: number,
    outputTokens: number | undefined,
    status: 'ok' | 'error',
    opts: { fallback?: number; error?: unknown } = {},
  ) => {
    if (settled) return
    settled = true
    clearTimeout(deadlineTimer)
    const charged = outputTokens ?? opts.fallback ?? reservedOutput
    logAiCall({
      kind: template.kind,
      model,
      status,
      inputTokens,
      outputTokens: charged,
      latencyMs: now() - started,
      appVersion,
      ...(opts.error ? { errorType: (opts.error as Error).name } : {}),
    })
    try {
      const after = await store.addUsage(auth.deviceId, day, {
        counters: [],
        calls: 0,
        inputTokens,
        outputTokens: charged - reservedOutput,
      })
      await alertOnSpend(day, after.total)
    } catch (err) {
      // The reservation stays: overcharging one call beats failing the response.
      logAiCall({
        kind: template.kind,
        model,
        status: 'error',
        errorType: `settle:${(err as Error).name}`,
        appVersion,
      })
    }
  }

  try {
    if (!body.data.stream) {
      const message = await anthropic().messages.create(request, requestOptions)
      const toolError = toolErrorOf(message.content)
      if (toolError !== undefined) {
        await settle(message.usage.input_tokens, message.usage.output_tokens, 'error', {
          error: toolFailure(toolError),
        })
        return Response.json({ error: SEARCH_UNAVAILABLE }, { status: 502, headers })
      }
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      await settle(message.usage.input_tokens, message.usage.output_tokens, 'ok')
      return Response.json(
        {
          text,
          model: message.model,
          stopReason: message.stop_reason,
          usage: {
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
          },
        },
        { headers },
      )
    }

    // SSE passthrough: forward Anthropic's stream events as our own SSE lines.
    const stream = await anthropic().messages.create({ ...request, stream: true }, requestOptions)
    const encoder = new TextEncoder()
    let inputTokens = 0
    let outputTokens: number | undefined
    /** The first failed server tool of the turn, if the search broke. */
    let toolError: string | undefined
    /** Characters of billable output seen so far — what a cancelled call is charged on. */
    let streamedChars = 0
    /** Set by `cancel`: the client stopped reading, so we stopped the stream. */
    let clientGone = false
    const streamedOutput = () =>
      Math.min(reservedOutput, Math.ceil(streamedChars / CHARS_PER_OUTPUT_TOKEN))
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        // After the client disconnects the controller refuses writes; the
        // settle below still has to run.
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            // Closed by the client.
          }
        }
        /** Set if the stream threw rather than ending. */
        let broke: unknown
        try {
          for await (const event of stream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens
            } else if (event.type === 'message_delta') {
              outputTokens = event.usage.output_tokens
            } else if (event.type === 'content_block_delta') {
              // Thinking is billed as output, so it counts too; the signature
              // that follows it is a blob, not tokens.
              if (event.delta.type === 'text_delta') streamedChars += event.delta.text.length
              else if (event.delta.type === 'thinking_delta')
                streamedChars += event.delta.thinking.length
            } else if (event.type === 'content_block_start') {
              toolError ??= serverToolError(event.content_block)
            }
            send(event.type, event)
            // The first failed search ends the call. Left to finish, the model
            // searches again into the same error until the server stops it,
            // and the answer is refused as search_unavailable all the same.
            // Leaving the loop aborts the request.
            if (toolError !== undefined) break
          }
        } catch (e) {
          broke = e
        }
        // A stream we stopped ourselves may end quietly (the SDK swallows its
        // own abort) or throw, so the reason is read from the flags, not from
        // how the loop ended. Each of those is charged what streamed: we
        // stopped the generation, so there is nothing more to pay for.
        if (toolError !== undefined || timedOut) {
          await settle(inputTokens, outputTokens, 'error', {
            error: toolFailure(toolError ?? 'deadline'),
            fallback: streamedOutput(),
          })
          send('proxy_error', { message: SEARCH_UNAVAILABLE })
        } else if (clientGone) {
          await settle(inputTokens, outputTokens, 'error', {
            error: broke ?? new Error('client disconnected'),
            fallback: streamedOutput(),
          })
        } else if (broke !== undefined) {
          // A stream that broke under us keeps the reservation, since a
          // response Anthropic billed for may have been lost (docs/04).
          await settle(inputTokens, outputTokens, 'error', { error: broke })
          send('proxy_error', { message: 'upstream_error' })
        } else {
          send('done', {})
          await settle(inputTokens, outputTokens, 'ok')
        }
        try {
          controller.close()
        } catch {
          // Already closed by the client.
        }
      },
      // The client went away: stop the generation it will never read. The loop
      // above then ends and settles, charging what had streamed by now. This
      // runs before the abort it causes, so the flag is always set in time.
      cancel() {
        clientGone = true
        stream.controller.abort()
      },
    })
    return new Response(readable, {
      headers: {
        ...headers,
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    })
  } catch (e) {
    // Anthropic answered with an error status (rejected, rate limited,
    // overloaded): nothing ran, so the held output is returned; the call still
    // counts. A connection error or timeout may have lost a response Anthropic
    // did bill for, so there the hold stands.
    // A search stopped at its deadline before it answered keeps the hold too.
    const rejected = e instanceof Anthropic.APIError && e.status !== undefined
    await settle(0, rejected ? 0 : undefined, 'error', {
      error: timedOut ? toolFailure('deadline') : e,
    })
    return Response.json(
      { error: timedOut ? SEARCH_UNAVAILABLE : 'upstream_error' },
      { status: 502, headers },
    )
  }
}
