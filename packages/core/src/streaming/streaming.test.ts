import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import { extractJsonText } from './json'
import { extractPartialBlocks } from './partial-blocks'
import { extractPartialActivityDoc } from './partial-doc'
import { extractPartialPath } from './partial-path'
import { extractPartialTopics } from './partial-topics'
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

describe('extractPartialPath', () => {
  const full = JSON.stringify({
    name: 'Conversational German',
    goals: [
      {
        title: 'Order in a café',
        description: 'The handful of phrases that carry a whole transaction.',
        concepts: [{ label: 'Polite requests', kind: 'skill' }],
      },
      {
        title: 'Read a simple menu',
        description: 'Food vocabulary and the grammar holding it together.',
        concepts: [{ label: 'Noun gender', kind: 'concept' }],
      },
    ],
  })

  it('surfaces the name before any goal has closed', () => {
    const result = extractPartialPath(full.slice(0, full.indexOf('"goals"') + 20))
    expect(result.name).toBe('Conversational German')
    expect(result.goals).toEqual([])
  })

  it('yields each goal as its object closes', () => {
    const cut = full.indexOf('"Read a simple menu"') + 10
    expect(extractPartialPath(full.slice(0, cut)).goals.map((g) => g.title)).toEqual(['Order in a café'])
    expect(extractPartialPath(full).goals.map((g) => g.title)).toEqual([
      'Order in a café',
      'Read a simple menu',
    ])
  })

  it('drops a goal that is complete JSON but fails the schema', () => {
    const bad = '{"name":"X","goals":[{"title":"No concepts","description":"d","concepts":[]}]}'
    expect(extractPartialPath(bad).goals).toEqual([])
  })
})

describe('extractPartialBlocks', () => {
  it('yields each block as it closes and stops at a half-written one', () => {
    const full = JSON.stringify({
      blocks: [
        { kind: 'paragraph', md: 'The short answer first.' },
        { kind: 'callout', tone: 'tip', md: 'And the nuance.' },
      ],
    })
    const cut = full.indexOf('callout') + 4
    expect(extractPartialBlocks(full.slice(0, cut)).map((b) => b.kind)).toEqual(['paragraph'])
    expect(extractPartialBlocks(full).map((b) => b.kind)).toEqual(['paragraph', 'callout'])
  })

  it('is empty until the array opens, and stops at an invalid block', () => {
    expect(extractPartialBlocks('{"blo')).toEqual([])
    const bad = '{"blocks":[{"kind":"paragraph","md":"ok"},{"kind":"telepathy"}]}'
    expect(extractPartialBlocks(bad).map((b) => b.kind)).toEqual(['paragraph'])
  })
})

describe('extractJsonText', () => {
  it('unwraps a markdown fence the model added anyway, and leaves bare JSON alone', () => {
    const object = '{\n  "next": []\n}'
    expect(extractJsonText('```json\n' + object + '\n```')).toBe(object)
    expect(extractJsonText('```\n' + object + '\n```\n')).toBe(object)
    expect(extractJsonText(object)).toBe(object)
    // A fence inside a string value isn't a wrapper.
    const inline = '{"md":"```code```"}'
    expect(extractJsonText(inline)).toBe(inline)
  })

  it('finds the object after the narration a web-search turn writes first', () => {
    const object = '{"resources":[{"url":"https://example.com"}]}'
    expect(extractJsonText(`I searched for a few sources. Here they are:\n\n${object}`)).toBe(object)
    // A stray brace in the narration doesn't win — the real object is larger.
    expect(extractJsonText(`Nothing usable {yet}.\n${object}`)).toBe(object)
  })

  it('escapes a raw line break inside a string, as Sonnet sometimes emits', () => {
    const raw = '{\n  "description": "so exchanges don\'t dead-end.\n",\n  "tab": "a\tb"\n}'
    expect(JSON.parse(extractJsonText(raw))).toEqual({
      description: "so exchanges don't dead-end.\n",
      tab: 'a\tb',
    })
  })
})

describe('extractPartialTopics', () => {
  const topic = (label: string) => ({ label, origin: 'foundational', blurb: `About ${label}.` })
  const full = JSON.stringify({
    topics: [topic('Noun genders'), topic('Present tense'), topic('Numbers')],
    outcomes: ['I can order food', 'I can read a menu', 'I understand der, die, das'],
  })

  it('yields each topic as its object closes', () => {
    expect(extractPartialTopics(full.slice(0, 20))).toEqual({ topics: [], complete: false })
    const afterFirst = full.indexOf('},') + 1
    expect(extractPartialTopics(full.slice(0, afterFirst)).topics).toEqual([topic('Noun genders')])
  })

  /**
   * The point of the merge: step 4 renders while the outcomes for step 5 are
   * still being written, so one call costs no more waiting than two did.
   */
  it('reports the topics complete as soon as outcomes begin, before the stream ends', () => {
    const atOutcomes = full.indexOf('"outcomes"') + '"outcomes": ['.length
    const partial = extractPartialTopics(full.slice(0, atOutcomes))
    expect(partial.complete).toBe(true)
    expect(partial.topics).toHaveLength(3)
  })

  it('stops at a topic that does not validate rather than showing half a chip', () => {
    const broken = JSON.stringify({ topics: [topic('Noun genders'), { label: 'No origin' }] })
    expect(extractPartialTopics(broken).topics).toEqual([topic('Noun genders')])
  })
})
