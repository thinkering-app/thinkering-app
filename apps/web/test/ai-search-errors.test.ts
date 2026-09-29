import type Anthropic from '@anthropic-ai/sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SEARCH_DEADLINE_MS } from '@thinkering/core'
import { PROMPT_INPUTS } from '@thinkering/core/prompt-inputs'
import { POST as aiPost } from '@/app/api/ai/route'
import { resetReplayCacheForTests } from '@/lib/server/auth'
import { APPROACH_BODY, fakeAnthropic, registerDevice, setupDeps, signedRequest } from './helpers'

/**
 * A web search that fails does not raise: the API answers 200 with a
 * tool-result block holding an error object instead of a list of results. Left
 * unexamined it is billed as a good answer, and the model's narration about
 * why it couldn't search reads downstream as malformed output — which earns a
 * repair, running the same searches into the same outage (docs/04).
 *
 * Measured once: a rate-limited resources.search spent 23,986 output tokens,
 * 19% of a device's daily budget, and returned nothing usable.
 */

beforeEach(() => resetReplayCacheForTests())

const SEARCH_ERROR = {
  type: 'web_search_tool_result',
  content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
}

async function callAi(body: string, blocks: unknown[]) {
  const setup = setupDeps({ anthropic: () => fakeAnthropic({ blocks, outputTokens: 5000 }) })
  const creds = await registerDevice(setup.store)
  const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))
  return { ...setup, res }
}

describe('a failed server tool', () => {
  it('answers search_unavailable rather than passing the narration off as output', async () => {
    const { res } = await callAi(APPROACH_BODY, [SEARCH_ERROR])
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'search_unavailable' })
  })

  it('is logged as its own error type, not as a billed success', async () => {
    const { logged } = await callAi(APPROACH_BODY, [SEARCH_ERROR])
    expect(logged.at(-1)).toMatchObject({
      status: 'error',
      errorType: 'search:max_uses_exceeded',
      outputTokens: 5000,
    })
  })

  it('ends a stream with proxy_error, so the client has something to not retry', async () => {
    const body = JSON.stringify({ ...JSON.parse(APPROACH_BODY), stream: true })
    const { res } = await callAi(body, [SEARCH_ERROR])
    const text = await res.text()
    expect(text).toContain('search_unavailable')
    expect(text).not.toContain('event: done')
  })

  it('ends a stream at the first failed search, charging only what streamed', async () => {
    const body = JSON.stringify({ ...JSON.parse(APPROACH_BODY), stream: true })
    const { res, logged } = await callAi(body, [SEARCH_ERROR])
    const text = await res.text()
    // The model's narration after the error never reaches the client.
    expect(text).not.toContain('text_delta')
    expect(logged.at(-1)).toMatchObject({
      status: 'error',
      errorType: 'search:max_uses_exceeded',
      outputTokens: 0,
    })
  })

  it('leaves an ordinary turn alone', async () => {
    const { res, logged } = await callAi(APPROACH_BODY, [])
    expect(res.status).toBe(200)
    expect(logged.at(-1)).toMatchObject({ status: 'ok' })
  })
})

describe('a search past its deadline', () => {
  afterEach(() => vi.useRealTimers())

  it('is stopped and answered search_unavailable, not left to run', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // A search that never finishes: one event, then nothing until aborted.
    const hanging = {
      messages: {
        create: async (_params: unknown, opts: { signal: AbortSignal }) =>
          (async function* () {
            yield { type: 'message_start', message: { usage: { input_tokens: 800 } } }
            await new Promise((resolve) => opts.signal.addEventListener('abort', resolve))
          })(),
      },
    } as unknown as Anthropic
    const setup = setupDeps({ anthropic: () => hanging })
    const creds = await registerDevice(setup.store)
    const body = JSON.stringify({
      kind: 'resources.search',
      params: PROMPT_INPUTS['resources.search'],
      stream: true,
    })
    const res = await aiPost(signedRequest('http://x/api/ai', creds, { body }))

    const text = res.text()
    await vi.advanceTimersByTimeAsync(SEARCH_DEADLINE_MS)
    expect(await text).toContain('search_unavailable')
    expect(setup.logged.at(-1)).toMatchObject({ status: 'error', errorType: 'search:deadline' })
  })
})
