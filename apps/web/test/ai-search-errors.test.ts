import { beforeEach, describe, expect, it } from 'vitest'
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

  it('leaves an ordinary turn alone', async () => {
    const { res, logged } = await callAi(APPROACH_BODY, [])
    expect(res.status).toBe(200)
    expect(logged.at(-1)).toMatchObject({ status: 'ok' })
  })
})
