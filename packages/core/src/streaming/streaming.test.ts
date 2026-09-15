import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import { extractPartialActivityDoc } from './partial-doc'
import { accumulateEvent, emptyAccumulator, SseParser } from './sse'

describe('SseParser', () => {
  it('assembles events across arbitrary chunk boundaries', () => {
    const parser = new SseParser()
    const wire = 'event: message_start\ndata: {"a":1}\n\nevent: content_block_delta\ndata: {"b":2}\n\n'
    const events = [...parser.push(wire.slice(0, 13)), ...parser.push(wire.slice(13, 40)), ...parser.push(wire.slice(40))]
    expect(events).toEqual([
      { event: 'message_start', data: '{"a":1}' },
      { event: 'content_block_delta', data: '{"b":2}' },
    ])
  })

  it('accumulates text and usage from anthropic stream events', () => {
    let acc = emptyAccumulator()
    acc = accumulateEvent(acc, 'message_start', { message: { usage: { input_tokens: 500 } } })
    acc = accumulateEvent(acc, 'content_block_delta', { delta: { type: 'text_delta', text: '{"na' } })
    acc = accumulateEvent(acc, 'content_block_delta', { delta: { type: 'text_delta', text: 'me":"x"}' } })
    acc = accumulateEvent(acc, 'message_delta', { usage: { output_tokens: 42 }, delta: { stop_reason: 'end_turn' } })
    acc = accumulateEvent(acc, 'message_stop', {})
    expect(acc).toEqual({ text: '{"name":"x"}', inputTokens: 500, outputTokens: 42, done: true, stopReason: 'end_turn' })
  })
})

describe('extractPartialActivityDoc', () => {
  const fullText = JSON.stringify(FIXTURE_DOC_INTRODUCE)

  it('yields each page as soon as its object closes', () => {
    // Cut mid-way through page 2: only page 1 should come back.
    const pageTwoAt = fullText.indexOf('"intro-precise"')
    const partial = fullText.slice(0, pageTwoAt + 40)
    const result = extractPartialActivityDoc(partial)
    expect(result.title).toBe(FIXTURE_DOC_INTRODUCE.title)
    expect(result.estMinutes).toBe(5)
    expect(result.tier).toBe('introduce')
    expect(result.pages.map((p) => p.id)).toEqual(['intro-hook'])
  })

  it('returns all pages for the complete document', () => {
    const result = extractPartialActivityDoc(fullText)
    expect(result.pages.map((p) => p.id)).toEqual(FIXTURE_DOC_INTRODUCE.pages.map((p) => p.id))
  })

  it('returns metadata but no pages before the pages array opens', () => {
    const before = fullText.slice(0, fullText.indexOf('"pages"'))
    const result = extractPartialActivityDoc(before)
    expect(result.title).toBe(FIXTURE_DOC_INTRODUCE.title)
    expect(result.pages).toEqual([])
  })

  it('ignores braces inside strings when balancing', () => {
    const tricky =
      '{"version":1,"pages":[{"id":"p1","kind":"content","blocks":[{"kind":"paragraph","md":"a { brace \\" and } inside"},{"kind":"reveal","id":"r","prompt":"q","md":"a"}]},{"id":"incomplete'
    const result = extractPartialActivityDoc(tricky)
    expect(result.pages.map((p) => p.id)).toEqual(['p1'])
  })

  it('stops at the first schema-invalid page', () => {
    const bad =
      '{"pages":[{"id":"p1","kind":"content","blocks":[{"kind":"mystery"}]},{"id":"p2","kind":"review","blocks":null}]}'
    expect(extractPartialActivityDoc(bad).pages).toEqual([])
  })
})
