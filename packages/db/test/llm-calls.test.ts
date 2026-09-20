import { describe, expect, it } from 'vitest'
import { listLlmCalls, llmCallTotals, logLlmCall } from '../src'
import { openTestDb, testContext } from './helpers'

describe('llm_calls log', () => {
  it('prunes to the newest ~200 calls', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    for (let i = 0; i < 230; i++) {
      ctx.advance(1000)
      logLlmCall(db, ctx, { kind: 'today.plan', model: 'm', request: { i }, status: 'ok' })
    }
    const calls = listLlmCalls(db, 500)
    expect(calls.length).toBe(200)
    // Newest kept, oldest gone.
    expect(calls[0]!.request).toEqual({ i: 229 })
    expect(calls[calls.length - 1]!.request).toEqual({ i: 30 })
  })

  it('totals a window by kind, heaviest first, ignoring what fell outside it', () => {
    const { db } = openTestDb()
    const ctx = testContext()
    const log = (kind: string, inputTokens: number | null, outputTokens: number | null) =>
      logLlmCall(db, ctx, {
        kind,
        model: 'm',
        request: {},
        status: 'ok',
        inputTokens,
        outputTokens,
      })

    log('today.plan', 900, 300)
    log('activity.generate', 2000, 5000)
    log('activity.generate', 2000, 4000)
    // Heavy on input, light on output: heaviest is weighted tokens, the unit
    // the cap uses, so this outranks activity.generate on 9,000 output.
    log('resources.search', 42_000, 80)
    // A call that never reported tokens is still a call.
    log('reflect.open', null, null)

    const totals = llmCallTotals(db, ctx.now() - 1000)
    expect(totals.map((t) => t.kind)).toEqual([
      'resources.search',
      'activity.generate',
      'today.plan',
      'reflect.open',
    ])
    expect(totals[1]).toMatchObject({ calls: 2, inputTokens: 4000, outputTokens: 9000 })
    // …and one the sums can't see, which is what `unreported` is for: an
    // aborted stream is charged by the proxy and reports nothing back.
    expect(totals[3]).toMatchObject({ calls: 1, inputTokens: 0, outputTokens: 0, unreported: 1 })
    expect(totals[1]).toMatchObject({ unreported: 0 })
    expect(llmCallTotals(db, ctx.now() + 1)).toEqual([])
  })
})
