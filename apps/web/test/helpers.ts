import type Anthropic from '@anthropic-ai/sdk'
import { signRequest } from '@/lib/server/auth'
import { setDepsForTests, type ServerDeps } from '@/lib/server/deps'
import { MemoryStore, type MeteringStore } from '@/lib/server/store'

export const NOW = Date.UTC(2026, 8, 15, 9, 0, 0) // fixed clock: 2026-09-15T09:00Z

export interface TestSetup {
  store: MeteringStore
  logged: Parameters<ServerDeps['logAiCall']>[0][]
  fetchCalls: { url: string; init?: RequestInit }[]
}

/** A minimal fake of the Anthropic client covering what the route uses. */
export function fakeAnthropic(opts: { text?: string; inputTokens?: number; outputTokens?: number } = {}) {
  const text = opts.text ?? '{"ok":true}'
  const message = {
    model: 'claude-test',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text }],
    usage: { input_tokens: opts.inputTokens ?? 1000, output_tokens: opts.outputTokens ?? 200 },
  }
  const events = [
    { type: 'message_start', message: { usage: { input_tokens: opts.inputTokens ?? 1000 } } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'message_delta', usage: { output_tokens: opts.outputTokens ?? 200 } },
    { type: 'message_stop' },
  ]
  return {
    messages: {
      create: async (params: { stream?: boolean }) => {
        if (params.stream) {
          return (async function* () {
            for (const event of events) yield event
          })()
        }
        return message
      },
    },
  } as unknown as Anthropic
}

export function setupDeps(overrides: Partial<ServerDeps> = {}): TestSetup {
  const store = new MemoryStore()
  const logged: TestSetup['logged'] = []
  const fetchCalls: TestSetup['fetchCalls'] = []
  setDepsForTests({
    store,
    now: () => NOW,
    anthropic: () => fakeAnthropic(),
    logAiCall: (entry) => logged.push(entry),
    fetch: (async (url: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init })
      return new Response('{}', { status: 200 })
    }) as typeof fetch,
    ...overrides,
  })
  return { store, logged, fetchCalls }
}

export async function registerDevice(store: MeteringStore): Promise<{ deviceId: string; secret: string }> {
  const creds = { deviceId: 'device-1', secret: 'a'.repeat(64) }
  await store.createDevice({ ...creds, platform: 'ios', createdAt: NOW, attested: false })
  return creds
}

export function signedRequest(
  url: string,
  creds: { deviceId: string; secret: string },
  opts: { body?: string; method?: string; timestamp?: number; signature?: string } = {},
): Request {
  const body = opts.body ?? ''
  const timestamp = opts.timestamp ?? NOW
  const signature = opts.signature ?? signRequest(creds.secret, creds.deviceId, timestamp, body)
  return new Request(url, {
    method: opts.method ?? (body ? 'POST' : 'GET'),
    ...(body ? { body } : {}),
    headers: {
      'content-type': 'application/json',
      'x-device-id': creds.deviceId,
      'x-timestamp': String(timestamp),
      'x-signature': signature,
    },
  })
}

/** Valid params for the cheapest implemented kind, used in /api/ai tests. */
export const APPROACH_BODY = JSON.stringify({
  kind: 'intake.approach',
  params: {
    wantToLearn: 'Get conversational in German',
    whyChoice: 'fun',
    experienceChoice: 'getting_started',
  },
  stream: false,
})
