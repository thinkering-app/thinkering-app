import { describe, expect, it } from 'vitest'
import { renderPromptFixture } from './inputs'
import { SHARED_PREAMBLE } from './preamble'
import { getPromptTemplate, PROMPTS, type ImplementedKind } from './registry'
import { modelRequestFields } from './request'
import { MODEL_IDS } from './types'

const kinds = Object.keys(PROMPTS) as ImplementedKind[]

describe('prompt templates', () => {
  // Prompts are the artifact, so string snapshots are correct here — the diff
  // is the review (docs/10 Tier 1). Bump the template version when one changes.
  it.each(kinds)('%s renders stably (snapshot)', (kind) => {
    expect(renderPromptFixture(kind)).toMatchSnapshot()
  })

  // The prompt snapshot carries none of this, so a changed model, token
  // limit, thinking effort or search budget used to land invisibly in a
  // review (docs/04 §Thinking, §Latency & cost).
  it.each(kinds)('%s sends stable request fields (snapshot)', (kind) => {
    expect(modelRequestFields(getPromptTemplate(kind)!)).toMatchSnapshot()
  })

  it.each(kinds)('%s: cache breakpoint sits after the shared preamble', (kind) => {
    const rendered = renderPromptFixture(kind)
    // A moved breakpoint silently doubles cost: block 0 must be the preamble,
    // byte-identical across kinds, and cache-marked.
    expect(rendered.system[0]?.text).toBe(SHARED_PREAMBLE)
    expect(rendered.system[0]?.cache).toBe(true)
    // Volatile content only in messages, never in system.
    expect(rendered.messages.length).toBeGreaterThan(0)
    expect(rendered.messages[0]?.role).toBe('user')
  })

  it.each(kinds)('%s: rendering twice is byte-identical (cache safety)', (kind) => {
    expect(JSON.stringify(renderPromptFixture(kind))).toBe(
      JSON.stringify(renderPromptFixture(kind)),
    )
  })

  it('every template has a version, a model with an id, and sane limits', () => {
    for (const kind of kinds) {
      const t = PROMPTS[kind]
      expect(t.kind).toBe(kind)
      expect(t.version).toBeGreaterThanOrEqual(1)
      expect(MODEL_IDS[t.model]).toBeTruthy()
      expect(t.maxTokens).toBeGreaterThan(0)
      // Sonnet 5 rejects sampling params — temperature is haiku-only.
      if (t.model === 'sonnet') expect(t.temperature).toBeUndefined()
      // Sonnet 5 thinks unless told otherwise, inside maxTokens: every Sonnet
      // kind states its effort (docs/04 §Thinking); Haiku 4.5 takes none.
      if (t.model === 'sonnet') expect(t.effort, `${kind} needs an effort`).toBeDefined()
      else expect(t.effort).toBeUndefined()
    }
  })
})
