import { RECORDED_RESPONSES } from '@thinkering/core'
import { PROMPT_INPUTS } from '@thinkering/core/prompt-inputs'

// `jest.mock` is hoisted above these imports, so the client gets the doubles below.
import {
  AiBudgetError,
  AiOutdatedClientError,
  AiOutputError,
  callAi,
  isSearchFailure,
} from './client'

/**
 * The rules `callAi` adds on top of the pieces tested in core and the proxy
 * (docs/10 Tier 4): when it retries, when it repairs, what it logs locally and
 * what one `ai_call` reports. Fixture mode skips all of this, so neither the
 * dev builds nor the Maestro flows reach it. The network is a scripted fake.
 */

const mockFetch = jest.fn()
const mockTrack = jest.fn()
const mockLog = jest.fn()
const mockAiMode = { current: 'proxy' }

jest.mock('expo/fetch', () => ({ fetch: (...args: unknown[]) => mockFetch(...args) }))
jest.mock('@thinkering/db', () => ({
  logLlmCall: (_db: unknown, _ctx: unknown, row: unknown) => mockLog(row),
}))
jest.mock('@/analytics', () => ({ track: (...args: unknown[]) => mockTrack(...args) }))
jest.mock('@/db', () => ({ db: {}, repoContext: {} }))
jest.mock('./device', () => ({ signedHeaders: async () => ({}) }))
jest.mock('./secure-store', () => ({ KEYS: { byokKey: 'byok' }, secureGet: async () => 'sk-test' }))
jest.mock('./settings', () => ({
  API_BASE_URL: 'https://thinkering.test',
  getAiMode: () => mockAiMode.current,
}))

/** A kind that gets a repair, and one that searches the web and doesn't. */
const PLAIN = 'reflect.open'
const SEARCHING = 'resources.search'
const VALID = RECORDED_RESPONSES[PLAIN]!.text

function streamed(text: string) {
  const events: [string, unknown][] = [
    ['message_start', { message: { model: 'claude-haiku', usage: { input_tokens: 10 } } }],
    ['content_block_delta', { delta: { type: 'text_delta', text } }],
    ['message_delta', { usage: { output_tokens: 5 }, delta: { stop_reason: 'end_turn' } }],
    ['message_stop', {}],
  ]
  const chunk = new TextEncoder().encode(
    events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(''),
  )
  let sent = false
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined }
          sent = true
          return { done: false, value: chunk }
        },
      }),
    },
  }
}

function failed(status: number, body = '') {
  return { ok: false, status, text: async () => body, json: async () => JSON.parse(body) }
}

function respond(...responses: unknown[]) {
  for (const res of responses) mockFetch.mockResolvedValueOnce(res)
}

function aiCalls() {
  return mockTrack.mock.calls.filter(([event]) => event === 'ai_call').map(([, props]) => props)
}

function call(kind: string, opts: Parameters<typeof callAi>[2] = {}) {
  return callAi(kind, PROMPT_INPUTS[kind as keyof typeof PROMPT_INPUTS], opts)
}

beforeEach(() => {
  mockFetch.mockReset()
  mockTrack.mockReset()
  mockLog.mockReset()
  mockAiMode.current = 'proxy'
})

describe('retries', () => {
  it('retries a transient failure once and reports it', async () => {
    respond(failed(503), streamed(VALID))
    await call(PLAIN)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'ok', error_type: 'none', retried: true, mode: 'proxy' }),
    ])
  })

  it('gives up after the one retry', async () => {
    respond(failed(503), failed(503))
    await expect(call(PLAIN)).rejects.toThrow('proxy error 503')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'error', error_type: 'upstream', retried: true }),
    ])
  })

  it('does not retry a failed web search into the same outage', async () => {
    respond(failed(502, '{"error":"search_unavailable"}'))
    const error = await call(SEARCHING).catch((e: unknown) => e)
    expect(isSearchFailure(error)).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'error', error_type: 'search_failed', retried: false }),
    ])
  })

  it('stops at the daily cap without retrying', async () => {
    respond(failed(429, '{"resetAt":"2026-10-03T00:00:00Z"}'))
    await expect(call(PLAIN)).rejects.toBeInstanceOf(AiBudgetError)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'rate_limited', error_type: 'rate_limited' }),
    ])
    expect(mockTrack).toHaveBeenCalledWith('cap_reached')
  })
})

describe('repairs', () => {
  it('repairs invalid output once: two local rows, one ai_call', async () => {
    respond(streamed('{}'), streamed(VALID))
    await call(PLAIN)
    const repairBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(repairBody.repair.previousText).toBe('{}')
    expect(mockLog.mock.calls.map(([row]) => row.status)).toEqual(['error', 'ok'])
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'ok', error_type: 'none', repaired: true }),
    ])
  })

  it('fails when the repair is invalid too', async () => {
    respond(streamed('{}'), streamed('{}'))
    await expect(call(PLAIN)).rejects.toBeInstanceOf(AiOutputError)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ status: 'error', error_type: 'invalid_output', repaired: true }),
    ])
  })

  it('does not repair a searching kind, and reads its bad output as a failed search', async () => {
    respond(streamed('The search tool is unavailable right now.'))
    const error = await call(SEARCHING).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AiOutputError)
    expect(isSearchFailure(error)).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(aiCalls()).toEqual([
      expect.objectContaining({ error_type: 'search_failed', repaired: false }),
    ])
  })
})

describe('other failures', () => {
  it('reads unknown_kind as an install older than the deployment', async () => {
    respond(failed(400, '{"error":"unknown_kind"}'))
    await expect(call(PLAIN)).rejects.toBeInstanceOf(AiOutdatedClientError)
    expect(aiCalls()).toEqual([expect.objectContaining({ error_type: 'outdated_client' })])
  })

  it('tells no connection apart from an error answer', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'))
    await expect(call(PLAIN)).rejects.toThrow('Network request failed')
    expect(aiCalls()).toEqual([expect.objectContaining({ error_type: 'network' })])
  })

  it('reads a refused BYO key as the learner’s key, not our outage', async () => {
    mockAiMode.current = 'byok'
    respond(failed(401))
    await expect(call(PLAIN)).rejects.toThrow('anthropic error 401')
    expect(aiCalls()).toEqual([expect.objectContaining({ error_type: 'byok_auth', mode: 'byok' })])
  })

  it('counts a cancelled call nowhere but the local log', async () => {
    const controller = new AbortController()
    mockFetch.mockImplementationOnce(async () => {
      controller.abort()
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    await expect(call(PLAIN, { signal: controller.signal })).rejects.toThrow('aborted')
    expect(aiCalls()).toEqual([])
    expect(mockLog.mock.calls.map(([row]) => row.status)).toEqual(['aborted'])
  })
})
