import { beforeEach, describe, expect, it, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { FIXTURE_DOC_INTRODUCE, getPromptTemplate } from '@thinkering/core'
import { POST as aiPost, MAX_BODY_CHARS } from '@/app/api/ai/route'
import { POST as registerPost, REGISTRATIONS_PER_IP_PER_DAY } from '@/app/api/device/register/route'
import { POST as redeemPost, REDEMPTIONS_PER_DEVICE_PER_DAY } from '@/app/api/device/redeem/route'
import { POST as contactPost, resetContactLimitForTests } from '@/app/api/contact/route'
import { POST as feedbackPost } from '@/app/api/feedback/route'
import { POST as reportPost } from '@/app/api/activity-report/route'
import { POST as deleteAccountPost } from '@/app/api/account/delete/route'
import { GET as usageGet } from '@/app/api/usage/route'
import { resetReplayCacheForTests } from '@/lib/server/auth'
import {
  BURST_LIMITS,
  checkBudget,
  DAILY_BUDGET_WEIGHTED,
  deviceLimit,
  GLOBAL_DAILY_BUDGET_WEIGHTED,
  REPAIR_COUNTER,
  RESERVED_WEIGHTED,
} from '@/lib/server/metering'
import type { MemoryStore } from '@/lib/server/store'
import {
  APPROACH_BODY,
  fakeAnthropic,
  NOW,
  registerDevice,
  setupDeps,
  signedRequest,
} from './helpers'

beforeEach(() => resetReplayCacheForTests())

const sentSubjects = (calls: { init?: RequestInit }[]) =>
  calls.map((c) => (JSON.parse(String(c.init?.body)) as { subject: string }).subject)

describe('POST /api/device/register', () => {
  it('issues credentials and stores the device', async () => {
    const { store } = setupDeps()
    const res = await registerPost(
      new Request('http://x/api/device/register', {
        method: 'POST',
        body: JSON.stringify({ platform: 'ios' }),
      }),
    )
    expect(res.status).toBe(200)
    const { deviceId, secret } = (await res.json()) as { deviceId: string; secret: string }
    expect(secret).toHaveLength(64)
    expect(await store.getDevice(deviceId)).toMatchObject({ secret, platform: 'ios' })
  })

  it('rejects bad input with 400, never 500', async () => {
    setupDeps()
    const res = await registerPost(
      new Request('http://x/api/device/register', {
        method: 'POST',
        body: '{"platform":"toaster"}',
      }),
    )
    expect(res.status).toBe(400)
    const noBody = await registerPost(
      new Request('http://x/api/device/register', { method: 'POST', body: 'not json' }),
    )
    expect(noBody.status).toBe(400)
  })

  it('limits registrations per address per day, since each device is a budget', async () => {
    setupDeps()
    const register = (ip: string) =>
      registerPost(
        new Request('http://x/api/device/register', {
          method: 'POST',
          body: '{"platform":"ios"}',
          headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
        }),
      )
    for (let i = 0; i < REGISTRATIONS_PER_IP_PER_DAY; i++)
      expect((await register('203.0.113.7')).status).toBe(200)
    expect((await register('203.0.113.7')).status).toBe(429)
    expect((await register('198.51.100.2')).status).toBe(200)
  })
})

describe('POST /api/ai — device auth (D10)', () => {
  it('rejects a bad signature', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const req = signedRequest('http://x/api/ai', creds, {
      body: APPROACH_BODY,
      signature: 'f'.repeat(64),
    })
    expect((await aiPost(req)).status).toBe(401)
  })

  it('rejects a stale timestamp', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const req = signedRequest('http://x/api/ai', creds, {
      body: APPROACH_BODY,
      timestamp: NOW - 10 * 60 * 1000,
    })
    expect((await aiPost(req)).status).toBe(401)
  })

  it('rejects a replayed request', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const first = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(first.status).toBe(200)
    const replay = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(replay.status).toBe(401)
    expect(((await replay.json()) as { error: string }).error).toContain('replay')
  })

  it('rejects an unknown device', async () => {
    setupDeps()
    const req = signedRequest(
      'http://x/api/ai',
      { deviceId: 'ghost', secret: 'b'.repeat(64) },
      { body: APPROACH_BODY },
    )
    expect((await aiPost(req)).status).toBe(401)
  })
})

describe('POST /api/ai — validation and behavior', () => {
  it('unknown kind and invalid params → 400 from Zod, never 500', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)

    const unknown = JSON.stringify({ kind: 'nope.kind', params: {} })
    expect((await aiPost(signedRequest('http://x/api/ai', creds, { body: unknown }))).status).toBe(
      400,
    )

    const badParams = JSON.stringify({ kind: 'intake.approach', params: { wantToLearn: 42 } })
    expect(
      (await aiPost(signedRequest('http://x/api/ai', creds, { body: badParams }))).status,
    ).toBe(400)
  })

  it('refuses a body past the size cap before touching the budget', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const huge = JSON.stringify({
      kind: 'intake.approach',
      params: { wantToLearn: 'x'.repeat(MAX_BODY_CHARS), whyChoice: 'fun' },
    })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: huge }))
    expect(res.status).toBe(413)
    expect((await store.getUsage(creds.deviceId, '2026-09-15')).calls).toBe(0)
  })

  it('writes in the language the client asks for, English when it names none', async () => {
    const systems: string[] = []
    const client = fakeAnthropic()
    const create = client.messages.create.bind(client.messages)
    client.messages.create = ((params: { system: { text: string }[] }) => {
      systems.push(params.system.map((b) => b.text).join('\n'))
      return create(params as never)
    }) as never
    const { store } = setupDeps({ anthropic: () => client })
    const creds = await registerDevice(store)
    const withLanguage = (language: string) =>
      JSON.stringify({ ...(JSON.parse(APPROACH_BODY) as object), language })

    for (const body of [APPROACH_BODY, withLanguage('es')]) {
      const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))
      expect(res.status).toBe(200)
    }
    expect(systems[0]).not.toContain('Language:')
    expect(systems[1]).toContain('the learner reads Spanish')

    const unknown = await aiPost(
      signedRequest('http://x/api/ai', creds, { body: withLanguage('fr') }),
    )
    expect(unknown.status).toBe(400)
  })

  it('returns the response with budget headers and meters usage (non-stream)', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-budget-limit')).toBe(String(DAILY_BUDGET_WEIGHTED))
    const body = (await res.json()) as { text: string; usage: { inputTokens: number } }
    expect(body.text).toBe('{"ok":true}')

    const usage = await store.getUsage(creds.deviceId, '2026-09-15')
    expect(usage).toMatchObject({ inputTokens: 1000, outputTokens: 200, calls: 1 })
    expect(usage.kindCalls['intake.approach']).toBe(1)
  })

  it('streams SSE events through with budget headers', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const body = JSON.stringify({ ...JSON.parse(APPROACH_BODY), stream: true })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const text = await res.text()
    expect(text).toContain('event: message_start')
    expect(text).toContain('content_block_delta')
    expect(text).toContain('event: done')
    expect((await store.getUsage(creds.deviceId, '2026-09-15')).outputTokens).toBe(200)
  })

  it('exhausted budget → 429 with a reset time (D14)', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    await store.addUsage(creds.deviceId, '2026-09-15', {
      counters: ['activity.generate'],
      calls: 1,
      inputTokens: DAILY_BUDGET_WEIGHTED,
      outputTokens: 0,
    })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(res.status).toBe(429)
    const body = (await res.json()) as { error: string; resetAt: string }
    expect(body.error).toBe('budget_exhausted')
    expect(body.resetAt).toBe('2026-09-16T00:00:00.000Z')
    expect(res.headers.get('x-budget-remaining')).toBe('0')
  })

  it('per-kind burst limit → 429 kind_limit_reached', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    for (let i = 0; i < 10; i++) {
      await store.addUsage(creds.deviceId, '2026-09-15', {
        counters: ['intake.approach'],
        calls: 1,
        inputTokens: 10,
        outputTokens: 1,
      })
    }
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(res.status).toBe(429)
    expect(((await res.json()) as { error: string }).error).toBe('kind_limit_reached')
  })

  it('holds parallel requests to the burst limit', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const results = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        aiPost(
          signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY, timestamp: NOW + i }),
        ),
      ),
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(BURST_LIMITS['intake.approach']!)
    const usage = await store.getUsage(creds.deviceId, '2026-09-15')
    // Refused calls give their reservation back; the admitted ones settle to what they used.
    expect(usage).toMatchObject({ calls: 10, inputTokens: 10 * 1000, outputTokens: 10 * 200 })
  })

  /** A stream that yields `deltas`, then hangs until the proxy aborts it. */
  const hangingStream = (deltas: unknown[]) => {
    const upstream = new AbortController()
    async function* events() {
      yield { type: 'message_start', message: { usage: { input_tokens: 700 } } }
      for (const delta of deltas) yield { type: 'content_block_delta', index: 0, delta }
      await new Promise((_, reject) => {
        const stop = () => reject(new Error('aborted'))
        if (upstream.signal.aborted) stop()
        upstream.signal.addEventListener('abort', stop)
      })
    }
    const anthropic = {
      messages: { create: async () => Object.assign(events(), { controller: upstream }) },
    }
    return { upstream, anthropic: anthropic as unknown as Anthropic }
  }

  const disconnect = async (anthropic: Anthropic) => {
    const { store } = setupDeps({ anthropic: () => anthropic })
    const creds = await registerDevice(store)
    const body = JSON.stringify({ ...JSON.parse(APPROACH_BODY), stream: true })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))
    const reader = res.body!.getReader()
    await reader.read()
    await reader.cancel()
    return { store, deviceId: creds.deviceId }
  }

  it('stops the model when the client disconnects, and charges only what streamed', async () => {
    // 600 characters of thinking and 300 of text are both billed output, so
    // both count; the signature between them is a blob, so it does not.
    const { upstream, anthropic } = hangingStream([
      { type: 'thinking_delta', thinking: 'x'.repeat(600) },
      { type: 'signature_delta', signature: 's'.repeat(9000) },
      { type: 'text_delta', text: 'y'.repeat(300) },
    ])
    const { store, deviceId } = await disconnect(anthropic)

    expect(upstream.signal.aborted).toBe(true)
    // Far below the reservation this used to be charged.
    await vi.waitFor(async () =>
      expect(await store.getUsage(deviceId, '2026-09-15')).toMatchObject({
        calls: 1,
        inputTokens: 700,
        outputTokens: 300,
      }),
    )
  })

  it('charges a disconnect before the first token almost nothing', async () => {
    const { store, deviceId } = await disconnect(hangingStream([]).anthropic)

    await vi.waitFor(async () =>
      expect(await store.getUsage(deviceId, '2026-09-15')).toMatchObject({
        calls: 1,
        outputTokens: 0,
      }),
    )
  })

  it('keeps the held output when the stream breaks rather than being cancelled', async () => {
    // Indistinguishable from a response Anthropic billed for and we lost, so
    // the reservation stands (docs/04 §Usage metering).
    async function* events() {
      yield { type: 'message_start', message: { usage: { input_tokens: 700 } } }
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'y'.repeat(300) },
      }
      throw new Error('connection reset')
    }
    const anthropic = {
      messages: {
        create: async () => Object.assign(events(), { controller: new AbortController() }),
      },
    }
    const { store } = setupDeps({ anthropic: () => anthropic as unknown as Anthropic })
    const creds = await registerDevice(store)
    const body = JSON.stringify({ ...JSON.parse(APPROACH_BODY), stream: true })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))
    await new Response(res.body).text()

    const maxTokens = getPromptTemplate('intake.approach')!.maxTokens
    await vi.waitFor(async () =>
      expect(await store.getUsage(creds.deviceId, '2026-09-15')).toMatchObject({
        calls: 1,
        outputTokens: maxTokens,
      }),
    )
  })

  it('returns the held output when Anthropic refuses the call, and keeps it when the connection fails', async () => {
    const failing = (error: Error) => ({
      messages: {
        create: async () => {
          throw error
        },
      },
    })
    const maxTokens = getPromptTemplate('intake.approach')!.maxTokens
    const cases = [
      {
        error: new Anthropic.InternalServerError(529, undefined, 'overloaded', new Headers()),
        charged: 0,
      },
      { error: new Anthropic.APIConnectionTimeoutError(), charged: maxTokens },
    ]
    for (const [i, { error, charged }] of cases.entries()) {
      const { store } = setupDeps({ anthropic: () => failing(error) as unknown as Anthropic })
      const creds = await registerDevice(store)
      const req = signedRequest('http://x/api/ai', creds, {
        body: APPROACH_BODY,
        timestamp: NOW + i,
      })
      expect((await aiPost(req)).status).toBe(502)
      expect(await store.getUsage(creds.deviceId, '2026-09-15')).toMatchObject({
        calls: 1,
        outputTokens: charged,
      })
    }
  })

  it('stops every device once the proxy-wide daily limit is spent, and emails once', async () => {
    const { store, fetchCalls } = setupDeps()
    const creds = await registerDevice(store)
    await store.addUsage('someone-else', '2026-09-15', {
      counters: ['activity.generate'],
      calls: 1,
      inputTokens: GLOBAL_DAILY_BUDGET_WEIGHTED,
      outputTokens: 0,
    })
    process.env.RESEND_API_KEY = 'test-key'
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    await aiPost(
      signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY, timestamp: NOW + 1 }),
    )
    delete process.env.RESEND_API_KEY
    expect(res.status).toBe(429)
    expect(((await res.json()) as { error: string }).error).toBe('service_limit_reached')
    expect(sentSubjects(fetchCalls)).toEqual(["AI spend at 100% of today's cap"])
  })

  it('emails once as the day crosses each spend alert level', async () => {
    const { store, fetchCalls } = setupDeps()
    const creds = await registerDevice(store)
    await store.addUsage('someone-else', '2026-09-15', {
      counters: [],
      calls: 1,
      inputTokens: GLOBAL_DAILY_BUDGET_WEIGHTED / 2,
      outputTokens: 0,
    })
    process.env.RESEND_API_KEY = 'test-key'
    for (let i = 0; i < 3; i++) {
      const req = signedRequest('http://x/api/ai', creds, {
        body: APPROACH_BODY,
        timestamp: NOW + i,
      })
      expect((await aiPost(req)).status).toBe(200)
    }
    delete process.env.RESEND_API_KEY
    expect(sentSubjects(fetchCalls)).toEqual(["AI spend at 50% of today's cap"])
  })

  it('caps repairs per day and refuses repair text longer than the kind can produce', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const repairBody = (previousText: string) =>
      JSON.stringify({
        ...JSON.parse(APPROACH_BODY),
        repair: { previousText, issues: ['domain: expected string'] },
      })
    const tooLong = 'x'.repeat(getPromptTemplate('intake.approach')!.maxTokens * 6 + 1)
    expect(
      (await aiPost(signedRequest('http://x/api/ai', creds, { body: repairBody(tooLong) }))).status,
    ).toBe(400)

    await store.addUsage(creds.deviceId, '2026-09-15', {
      counters: [REPAIR_COUNTER],
      calls: BURST_LIMITS[REPAIR_COUNTER]!,
      inputTokens: 0,
      outputTokens: 0,
    })
    const res = await aiPost(
      signedRequest('http://x/api/ai', creds, { body: repairBody('{"domain": 42}') }),
    )
    expect(res.status).toBe(429)
    // A plain call of the same kind is still fine.
    expect(
      (await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))).status,
    ).toBe(200)
  })

  it('accepts a repair round-trip and rejects an empty one', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const withRepair = JSON.stringify({
      ...JSON.parse(APPROACH_BODY),
      repair: { previousText: '{"domain": 42}', issues: ['domain: expected string'] },
    })
    expect(
      (await aiPost(signedRequest('http://x/api/ai', creds, { body: withRepair }))).status,
    ).toBe(200)

    const badRepair = JSON.stringify({
      ...JSON.parse(APPROACH_BODY),
      repair: { previousText: 'x', issues: [] },
    })
    expect(
      (await aiPost(signedRequest('http://x/api/ai', creds, { body: badRepair }))).status,
    ).toBe(400)
  })

  it('the logger never receives prompt or response bodies', async () => {
    const { store, logged } = setupDeps()
    const creds = await registerDevice(store)
    await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(logged).toHaveLength(1)
    const keys = Object.keys(logged[0]!)
    // An allowlist, not a sample: adding a key here is the moment to check it
    // can't carry anything the learner wrote. `appVersion` is a build number.
    expect(keys.sort()).toEqual([
      'appVersion',
      'inputTokens',
      'kind',
      'latencyMs',
      'model',
      'outputTokens',
      'status',
    ])
    expect(JSON.stringify(logged[0])).not.toContain('German')
  })
})

describe('reserved headroom (docs/04)', () => {
  const usageAt = (weighted: number) => ({
    inputTokens: weighted,
    outputTokens: 0,
    calls: 1,
    kindCalls: {},
  })

  it('generation kinds stop at budget − reserve; in-activity kinds keep going', () => {
    const nearCap = usageAt(DAILY_BUDGET_WEIGHTED - RESERVED_WEIGHTED)
    expect(checkBudget('activity.generate', nearCap).allowed).toBe(false)
    expect(checkBudget('today.plan', nearCap).allowed).toBe(false)
    expect(checkBudget('activity.review', nearCap).allowed).toBe(true)
    expect(checkBudget('activity.question', nearCap).allowed).toBe(true)

    const fullCap = usageAt(DAILY_BUDGET_WEIGHTED)
    expect(checkBudget('activity.review', fullCap).allowed).toBe(false)
  })
})

describe('GET /api/usage', () => {
  it('returns the meter for the signed device', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    await store.addUsage(creds.deviceId, '2026-09-15', {
      counters: ['today.plan'],
      calls: 1,
      inputTokens: 1000,
      outputTokens: 500,
    })
    const res = await usageGet(signedRequest('http://x/api/usage', creds))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { used: number; remaining: number; resetAt: string }
    expect(body.used).toBe(3000) // 1000 + 4×500
    expect(body.remaining).toBe(DAILY_BUDGET_WEIGHTED - 3000)
  })

  it('requires device auth', async () => {
    setupDeps()
    expect((await usageGet(new Request('http://x/api/usage'))).status).toBe(401)
  })
})

describe('POST /api/feedback (private channel)', () => {
  const body = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      message: 'The strengthen cards feel repetitive.',
      context: { screen: 'today', platform: 'ios', appVersion: '0.1.0' },
      ...extra,
    })

  it('forwards the message with its coarse context and no learning data', async () => {
    const { store, fetchCalls } = setupDeps()
    const creds = await registerDevice(store)
    process.env.RESEND_API_KEY = 'test-key'
    const res = await feedbackPost(signedRequest('http://x/api/feedback', creds, { body: body() }))
    delete process.env.RESEND_API_KEY

    expect(res.status).toBe(200)
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]!.url).toContain('resend.com')
    const sent = JSON.parse(String(fetchCalls[0]!.init?.body)) as Record<string, unknown>
    expect(sent.subject).toBe('Feedback · today · ios 0.1.0')
    expect(sent.text).toBe('The strengthen cards feel repetitive.')
    expect(sent.reply_to).toBeUndefined()
  })

  it('makes a reply address the Reply-To, and says so when app details are withheld', async () => {
    const { store, fetchCalls } = setupDeps()
    const creds = await registerDevice(store)
    process.env.RESEND_API_KEY = 'test-key'
    const withEmail = JSON.stringify({ message: 'Ping me', replyEmail: 'learner@example.com' })
    const res = await feedbackPost(
      signedRequest('http://x/api/feedback', creds, { body: withEmail }),
    )
    delete process.env.RESEND_API_KEY

    expect(res.status).toBe(200)
    const sent = JSON.parse(String(fetchCalls[0]!.init?.body)) as Record<string, unknown>
    expect(sent.reply_to).toBe('learner@example.com')
    expect(sent.subject).toBe('Feedback · no app details')
  })

  it('requires device auth', async () => {
    setupDeps()
    const res = await feedbackPost(
      new Request('http://x/api/feedback', { method: 'POST', body: body() }),
    )
    expect(res.status).toBe(401)
  })

  it('rejects an empty message, an over-long one, and an unknown screen', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const post = (raw: string) =>
      feedbackPost(signedRequest('http://x/api/feedback', creds, { body: raw }))

    expect((await post(JSON.stringify({ message: '' }))).status).toBe(400)
    expect((await post(JSON.stringify({ message: 'x'.repeat(4001) }))).status).toBe(400)
    expect(
      (
        await post(
          body({ context: { screen: '/activity/0199a0f0', platform: 'ios', appVersion: '0.1.0' } }),
        )
      ).status,
    ).toBe(400)
  })

  it('counts against a persistent daily limit', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const day = '2026-09-15'
    for (let i = 0; i < 20; i++) await store.countDeviceAction(creds.deviceId, day, 'feedback')
    const res = await feedbackPost(signedRequest('http://x/api/feedback', creds, { body: body() }))
    expect(res.status).toBe(429)
  })

  it('reports a provider failure without logging the message', async () => {
    const logs: string[] = []
    const spy = vi
      .spyOn(console, 'log')
      .mockImplementation((line: unknown) => logs.push(String(line)))
    const { store } = setupDeps({
      fetch: (async () => new Response('nope', { status: 500 })) as typeof fetch,
    })
    const creds = await registerDevice(store)
    process.env.RESEND_API_KEY = 'test-key'
    const res = await feedbackPost(signedRequest('http://x/api/feedback', creds, { body: body() }))
    delete process.env.RESEND_API_KEY
    spy.mockRestore()

    expect(res.status).toBe(502)
    expect(logs.join('\n')).not.toContain('repetitive')
  })
})

describe('POST /api/activity-report (D18)', () => {
  const report = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      title: 'Tokens, not words',
      libraryItemId: 'worked-example',
      tier: 'introduce',
      rating: 'up',
      comment: 'Clear.',
      doc: FIXTURE_DOC_INTRODUCE,
      context: { screen: 'activity', platform: 'ios', appVersion: '0.1.0' },
      ...extra,
    })

  it('forwards the activity, and never the answers even if a client sends them', async () => {
    const { store, fetchCalls } = setupDeps()
    const creds = await registerDevice(store)
    process.env.RESEND_API_KEY = 'test-key'
    const withoutAnswers = await reportPost(
      signedRequest('http://x/api/activity-report', creds, { body: report() }),
    )
    const withAnswers = await reportPost(
      signedRequest('http://x/api/activity-report', creds, {
        body: report({ responses: [{ prompt: 'What is a token?', answer: 'A chunk of text' }] }),
        timestamp: NOW + 1,
      }),
    )
    delete process.env.RESEND_API_KEY

    expect([withoutAnswers.status, withAnswers.status]).toEqual([200, 200])
    const first = JSON.parse(String(fetchCalls[0]!.init?.body)) as { subject: string; text: string }
    expect(first.subject).toContain('Shared activity')
    expect(first.text).toContain('Tokens, not words')
    expect(first.text).not.toContain('their answers')

    const second = JSON.parse(String(fetchCalls[1]!.init?.body)) as { text: string }
    expect(second.text).not.toContain('A chunk of text')
  })

  it('refuses an oversized report and a malformed document', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const huge = report({ comment: 'x'.repeat(90_000) })
    expect(
      (await reportPost(signedRequest('http://x/api/activity-report', creds, { body: huge })))
        .status,
    ).toBe(413)

    const broken = report({ doc: { version: 1, pages: [] } })
    expect(
      (await reportPost(signedRequest('http://x/api/activity-report', creds, { body: broken })))
        .status,
    ).toBe(400)
  })

  it('counts against its own, tighter daily limit', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    for (let i = 0; i < 5; i++)
      await store.countDeviceAction(creds.deviceId, '2026-09-15', 'activity_report')
    const res = await reportPost(
      signedRequest('http://x/api/activity-report', creds, { body: report() }),
    )
    expect(res.status).toBe(429)
  })
})

describe('POST /api/account/delete (App Review 5.1.1(v))', () => {
  const signed = (creds: { deviceId: string; secret: string }, token?: string) => {
    const req = signedRequest('http://x/api/account/delete', creds, { body: '', method: 'POST' })
    if (token) req.headers.set('authorization', `Bearer ${token}`)
    return req
  }

  it('deletes only the account the access token belongs to', async () => {
    const deleted: string[] = []
    const { store } = setupDeps({
      deleteAccount: async (token) => {
        deleted.push(token)
        return { ok: true }
      },
    })
    const creds = await registerDevice(store)

    const res = await deleteAccountPost(signed(creds, 'access-token-abc'))
    expect(res.status).toBe(200)
    expect(deleted).toEqual(['access-token-abc'])
  })

  it('refuses without an access token, and passes a bad one through as a 401', async () => {
    const { store } = setupDeps({
      deleteAccount: async () => ({ ok: false, status: 401, error: 'invalid_access_token' }),
    })
    const creds = await registerDevice(store)

    expect((await deleteAccountPost(signed(creds))).status).toBe(401)
    resetReplayCacheForTests()
    expect((await deleteAccountPost(signed(creds, 'stale'))).status).toBe(401)
  })

  it('is device-signed and rate limited like the other routes', async () => {
    const { store } = setupDeps({ deleteAccount: async () => ({ ok: true }) })
    const creds = await registerDevice(store)
    const unsigned = new Request('http://x/api/account/delete', { method: 'POST' })
    expect((await deleteAccountPost(unsigned)).status).toBe(401)

    for (let i = 0; i < 5; i++)
      await store.countDeviceAction(creds.deviceId, '2026-09-15', 'account_delete')
    expect((await deleteAccountPost(signed(creds, 'token'))).status).toBe(429)
  })
})

describe('POST /api/contact (landing page form)', () => {
  const body = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'I would like to try the beta.',
      ...extra,
    })
  const post = (raw: string) =>
    contactPost(
      new Request('http://x/api/contact', {
        method: 'POST',
        body: raw,
        headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
      }),
    )

  beforeEach(() => resetContactLimitForTests())

  it('forwards to the contact inbox with the sender as Reply-To', async () => {
    const { fetchCalls } = setupDeps()
    process.env.RESEND_API_KEY = 'test-key'
    const res = await post(body())
    delete process.env.RESEND_API_KEY

    expect(res.status).toBe(200)
    const sent = JSON.parse(String(fetchCalls[0]!.init?.body)) as Record<string, unknown>
    expect(sent.to).toEqual(['contact@thinkering.app'])
    expect(sent.subject).toBe('Contact · Ada')
    expect(sent.reply_to).toBe('ada@example.com')
    expect(sent.text).toContain('I would like to try the beta.')
  })

  it('rejects a missing field, a bad address, and a filled honeypot', async () => {
    setupDeps()
    expect((await post(JSON.stringify({ name: 'Ada', email: 'ada@example.com' }))).status).toBe(400)
    expect((await post(body({ email: 'not-an-address' }))).status).toBe(400)
    expect((await post(body({ website: 'http://spam.example' }))).status).toBe(400)
  })

  it('caps submissions per IP per day', async () => {
    setupDeps()
    for (let i = 0; i < 5; i++) expect((await post(body())).status).toBe(200)
    expect((await post(body())).status).toBe(429)
  })
})

describe('POST /api/device/redeem (budget codes)', () => {
  const BONUS = 1_000_000

  const setupWithCode = async (code = 'BETA-TEST-0001') => {
    const { store } = setupDeps()
    ;(store as MemoryStore).addCodeForTests(code, BONUS)
    const creds = await registerDevice(store)
    return { store, creds, code }
  }

  const redeem = (creds: { deviceId: string; secret: string }, code: string, at = NOW) => {
    const body = JSON.stringify({ code })
    return redeemPost(signedRequest('http://x/api/device/redeem', creds, { body, timestamp: at }))
  }

  it('grants the bonus once, and the meter reports the raised limit', async () => {
    const { store, creds, code } = await setupWithCode()

    const res = await redeem(creds, code)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ granted: BONUS, limit: DAILY_BUDGET_WEIGHTED + BONUS })

    const usage = await usageGet(
      signedRequest('http://x/api/usage', creds, { body: '', method: 'GET', timestamp: NOW + 1 }),
    )
    expect(await usage.json()).toMatchObject({
      limit: DAILY_BUDGET_WEIGHTED + BONUS,
      granted: BONUS,
    })
    expect(await store.getBonus(creds.deviceId)).toBe(BONUS)
  })

  it('accepts the code however it was typed', async () => {
    const { creds } = await setupWithCode('BETA-TEST-0001')
    expect((await redeem(creds, ' beta test 0001 ')).status).toBe(200)
  })

  it('refuses a second device the same code, and says no more than that', async () => {
    const { store, creds, code } = await setupWithCode()
    expect((await redeem(creds, code)).status).toBe(200)

    const other = await registerDevice(store)
    const res = await redeem(other, code, NOW + 1)
    expect(res.status).toBe(404)
    // Unknown and already-used answer alike, so the route says nothing about
    // which codes exist.
    const unknown = await redeem(other, 'ZZZZ-ZZZZ-ZZZZ', NOW + 2)
    expect(unknown.status).toBe(404)
    expect(await res.json()).toEqual(await unknown.json())
  })

  it('counts attempts so one device cannot sweep the keyspace', async () => {
    const { creds } = await setupWithCode()
    for (let i = 0; i < REDEMPTIONS_PER_DEVICE_PER_DAY; i++) {
      expect((await redeem(creds, 'ZZZZ-ZZZZ-ZZZZ', NOW + i)).status).toBe(404)
    }
    const over = await redeem(creds, 'ZZZZ-ZZZZ-ZZZZ', NOW + 99)
    expect(over.status).toBe(429)
  })

  it('raises the token ceiling and the burst limits together', () => {
    const atIncluded = {
      inputTokens: DAILY_BUDGET_WEIGHTED,
      outputTokens: 0,
      calls: 0,
      kindCalls: { 'today.plan': BURST_LIMITS['today.plan']! },
    }
    // Both ceilings stop the call without a grant...
    expect(checkBudget('today.plan', atIncluded)).toEqual({
      allowed: false,
      reason: 'kind_limit_reached',
    })
    // ...and a grant lifts both, or the kind limit would make the extra
    // tokens unspendable.
    expect(checkBudget('today.plan', atIncluded, { bonusWeighted: DAILY_BUDGET_WEIGHTED })).toEqual(
      {
        allowed: true,
      },
    )
    expect(deviceLimit(BONUS)).toBe(DAILY_BUDGET_WEIGHTED + BONUS)
  })

  it('cannot lift the proxy-wide cap', () => {
    const spent = { inputTokens: GLOBAL_DAILY_BUDGET_WEIGHTED, outputTokens: 0 }
    expect(
      checkBudget(
        'today.plan',
        { inputTokens: 0, outputTokens: 0, calls: 0, kindCalls: {} },
        {
          total: spent,
          bonusWeighted: BONUS,
        },
      ),
    ).toEqual({ allowed: false, reason: 'service_limit_reached' })
  })
})
