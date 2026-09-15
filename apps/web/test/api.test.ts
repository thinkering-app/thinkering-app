import { beforeEach, describe, expect, it } from 'vitest'
import { POST as aiPost } from '@/app/api/ai/route'
import { POST as registerPost } from '@/app/api/device/register/route'
import { POST as feedbackPost } from '@/app/api/feedback/route'
import { GET as usageGet } from '@/app/api/usage/route'
import { resetReplayCacheForTests } from '@/lib/server/auth'
import { checkBudget, DAILY_BUDGET_WEIGHTED, RESERVED_WEIGHTED } from '@/lib/server/metering'
import { APPROACH_BODY, NOW, registerDevice, setupDeps, signedRequest } from './helpers'

beforeEach(() => resetReplayCacheForTests())

describe('POST /api/device/register', () => {
  it('issues credentials and stores the device', async () => {
    const { store } = setupDeps()
    const res = await registerPost(
      new Request('http://x/api/device/register', { method: 'POST', body: JSON.stringify({ platform: 'ios' }) }),
    )
    expect(res.status).toBe(200)
    const { deviceId, secret } = (await res.json()) as { deviceId: string; secret: string }
    expect(secret).toHaveLength(64)
    expect(await store.getDevice(deviceId)).toMatchObject({ secret, platform: 'ios' })
  })

  it('rejects bad input with 400, never 500', async () => {
    setupDeps()
    const res = await registerPost(
      new Request('http://x/api/device/register', { method: 'POST', body: '{"platform":"toaster"}' }),
    )
    expect(res.status).toBe(400)
    const noBody = await registerPost(new Request('http://x/api/device/register', { method: 'POST', body: 'not json' }))
    expect(noBody.status).toBe(400)
  })
})

describe('POST /api/ai — device auth (D10)', () => {
  it('rejects a bad signature', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const req = signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY, signature: 'f'.repeat(64) })
    expect((await aiPost(req)).status).toBe(401)
  })

  it('rejects a stale timestamp', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)
    const req = signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY, timestamp: NOW - 10 * 60 * 1000 })
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
    const req = signedRequest('http://x/api/ai', { deviceId: 'ghost', secret: 'b'.repeat(64) }, { body: APPROACH_BODY })
    expect((await aiPost(req)).status).toBe(401)
  })
})

describe('POST /api/ai — validation and behavior', () => {
  it('unknown kind and invalid params → 400 from Zod, never 500', async () => {
    const { store } = setupDeps()
    const creds = await registerDevice(store)

    const unknown = JSON.stringify({ kind: 'nope.kind', params: {} })
    expect((await aiPost(signedRequest('http://x/api/ai', creds, { body: unknown }))).status).toBe(400)

    const badParams = JSON.stringify({ kind: 'intake.approach', params: { wantToLearn: 42 } })
    expect((await aiPost(signedRequest('http://x/api/ai', creds, { body: badParams }))).status).toBe(400)
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
      kind: 'activity.generate',
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
      await store.addUsage(creds.deviceId, '2026-09-15', { kind: 'intake.approach', inputTokens: 10, outputTokens: 1 })
    }
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(res.status).toBe(429)
    expect(((await res.json()) as { error: string }).error).toBe('kind_limit_reached')
  })

  it('the logger never receives prompt or response bodies', async () => {
    const { store, logged } = setupDeps()
    const creds = await registerDevice(store)
    await aiPost(signedRequest('http://x/api/ai', creds, { body: APPROACH_BODY }))
    expect(logged).toHaveLength(1)
    const keys = Object.keys(logged[0]!)
    expect(keys.sort()).toEqual(['inputTokens', 'kind', 'latencyMs', 'model', 'outputTokens', 'status'])
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
    await store.addUsage(creds.deviceId, '2026-09-15', { kind: 'today.plan', inputTokens: 1000, outputTokens: 500 })
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

describe('POST /api/feedback', () => {
  it('validates and forwards to Resend without learning data', async () => {
    const { fetchCalls } = setupDeps()
    process.env.RESEND_API_KEY = 'test-key'
    const res = await feedbackPost(
      new Request('http://x/api/feedback', {
        method: 'POST',
        headers: { 'x-device-id': 'device-9' },
        body: JSON.stringify({
          message: 'The strengthen cards feel repetitive.',
          context: { screen: 'today', appVersion: '0.0.1', platform: 'ios' },
        }),
      }),
    )
    delete process.env.RESEND_API_KEY
    expect(res.status).toBe(200)
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]!.url).toContain('resend.com')
  })

  it('bad input → 400', async () => {
    setupDeps()
    const res = await feedbackPost(
      new Request('http://x/api/feedback', { method: 'POST', body: JSON.stringify({ message: '' }) }),
    )
    expect(res.status).toBe(400)
  })
})
