import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getPromptTemplate, modelRequestFields, type RenderedPrompt } from '@thinkering/core'
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

const TOOL_RESULT_TYPES = new Set(['web_search_tool_result', 'web_fetch_tool_result'])

/**
 * The error code of a failed server tool, if this content block is one.
 *
 * Server tools don't raise. A search that was rate limited or ran out of uses
 * comes back as a normal 200 whose tool-result block holds a single error
 * object instead of a list of results, so an outage is indistinguishable from
 * a good answer unless it is looked for. Unlooked-for, it gets billed as `ok`,
 * and the model's narration about why it couldn't search reads downstream as
 * malformed output — which invites a repair, running the same searches again
 * for the same failure (docs/04 §Usage metering).
 */
function serverToolError(block: unknown): string | undefined {
  const { type, content } = (block ?? {}) as { type?: string; content?: unknown }
  if (type === undefined || !TOOL_RESULT_TYPES.has(type)) return undefined
  // Success is a list of results; failure is one object carrying `error_code`.
  if (content === null || typeof content !== 'object' || Array.isArray(content)) return undefined
  return (content as { error_code?: string }).error_code ?? 'unknown'
}

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

  const rendered = template.render(params.data as never)
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

  /**
   * The SDK retries 429s and 5xxs twice by default. On a kind that searches
   * the web that turns one rate-limited call into three, each running its own
   * searches and each billed — and the thing being rate limited is usually the
   * search, so the retries fail the same way. These kinds surface the failure
   * instead (docs/04 §Usage metering).
   */
  const requestOptions = template.tools?.webSearch ? { maxRetries: 0 } : {}

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
    /** Set by `cancel`: this stream was stopped by us, not broken under us. */
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
          }
          if (toolError !== undefined) {
            // The turn completed, so it is paid for either way; what it must
            // not do is look like a usable answer.
            await settle(inputTokens, outputTokens, 'error', { error: toolFailure(toolError) })
            send('proxy_error', { message: SEARCH_UNAVAILABLE })
          } else {
            send('done', {})
            await settle(inputTokens, outputTokens, 'ok')
          }
        } catch (e) {
          // A client that walked away is charged for what it streamed: we
          // stopped the generation ourselves, so there is nothing more to pay
          // for. A stream that broke under us keeps the reservation, since a
          // response Anthropic billed for may have been lost (docs/04).
          await settle(inputTokens, outputTokens, 'error', {
            error: e,
            ...(clientGone ? { fallback: streamedOutput() } : {}),
          })
          send('proxy_error', { message: 'upstream_error' })
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
    const rejected = e instanceof Anthropic.APIError && e.status !== undefined
    await settle(0, rejected ? 0 : undefined, 'error', { error: e })
    return Response.json({ error: 'upstream_error' }, { status: 502, headers })
  }
}
