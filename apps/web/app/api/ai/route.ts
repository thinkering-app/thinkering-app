import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getPromptTemplate, MODEL_IDS, type RenderedPrompt } from '@thinkering/core'
import { verifyDeviceAuth } from '@/lib/server/auth'
import { getDeps } from '@/lib/server/deps'
import { budgetHeaders, checkBudget, nextUtcMidnight, utcDayOf } from '@/lib/server/metering'

/**
 * The AI proxy (docs/02 §AI access, docs/04). The client sends {kind, params},
 * never raw prompts — the server renders the same packages/core template and
 * streams Anthropic's SSE back. Prompt and response bodies are never logged.
 */

export const maxDuration = 300

const bodySchema = z.object({
  kind: z.string().min(1),
  params: z.unknown(),
  stream: z.boolean().optional().default(true),
})

function toAnthropicRequest(
  template: NonNullable<ReturnType<typeof getPromptTemplate>>,
  rendered: RenderedPrompt,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MODEL_IDS[template.model],
    max_tokens: template.maxTokens,
    ...(template.model === 'haiku' && template.temperature !== undefined
      ? { temperature: template.temperature }
      : {}),
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
  if (!template) return Response.json({ error: 'unknown_kind' }, { status: 400 })

  const params = template.paramsSchema.safeParse(body.data.params)
  if (!params.success) {
    return Response.json({ error: 'invalid_params', issues: params.error.issues }, { status: 400 })
  }

  const day = utcDayOf(now())
  const usage = await store.getUsage(auth.deviceId, day)
  const headers = budgetHeaders(usage, now())
  const decision = checkBudget(template.kind, usage)
  if (!decision.allowed) {
    return Response.json(
      { error: decision.reason, resetAt: nextUtcMidnight(now()) },
      { status: 429, headers },
    )
  }

  const rendered = template.render(params.data as never)
  const request = toAnthropicRequest(template, rendered)
  const started = now()
  const model = request.model

  const recordUsage = async (inputTokens: number, outputTokens: number, status: 'ok' | 'error') => {
    logAiCall({
      kind: template.kind,
      model,
      status,
      inputTokens,
      outputTokens,
      latencyMs: now() - started,
    })
    if (status === 'ok') {
      await store.addUsage(auth.deviceId, day, { kind: template.kind, inputTokens, outputTokens })
    }
  }

  try {
    if (!body.data.stream) {
      const message = await anthropic().messages.create(request)
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      await recordUsage(message.usage.input_tokens, message.usage.output_tokens, 'ok')
      return Response.json(
        {
          text,
          model: message.model,
          stopReason: message.stop_reason,
          usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
        },
        { headers },
      )
    }

    // SSE passthrough: forward Anthropic's stream events as our own SSE lines.
    const stream = await anthropic().messages.create({ ...request, stream: true })
    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let inputTokens = 0
        let outputTokens = 0
        try {
          for await (const event of stream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens
            } else if (event.type === 'message_delta') {
              outputTokens = event.usage.output_tokens
            }
            controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
          }
          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))
          await recordUsage(inputTokens, outputTokens, 'ok')
          controller.close()
        } catch (e) {
          await recordUsage(inputTokens, outputTokens, 'error')
          controller.enqueue(
            encoder.encode(`event: proxy_error\ndata: ${JSON.stringify({ message: 'upstream_error' })}\n\n`),
          )
          controller.close()
          logAiCall({ kind: template.kind, model, status: 'error', errorType: (e as Error).name })
        }
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
    logAiCall({ kind: template.kind, model, status: 'error', errorType: (e as Error).name })
    return Response.json({ error: 'upstream_error' }, { status: 502, headers })
  }
}
