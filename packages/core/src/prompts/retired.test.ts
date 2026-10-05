import { describe, expect, it } from 'vitest'
import { getPromptTemplate, isRetiredKind, PROMPTS, RETIRED_PROMPTS } from './registry'
import { modelRequestFields } from './request'
import { RETIRED_KINDS } from './types'

/**
 * The compatibility shims (docs/04 §Retired kinds). What these protect is an
 * install that predates a rename: it sends a kind this build no longer
 * generates, and without a template the proxy answers 400 before it reaches
 * the model — a dead intake with no server-side trace, unfixable without a new
 * build because there is no OTA. The contract is that the proxy still renders
 * them, so it is the resolution that gets tested, not the prompt text.
 */

const kinds = [...RETIRED_KINDS]

describe('retired kinds', () => {
  it.each(kinds)('%s still resolves to a template the proxy can render', (kind) => {
    const template = getPromptTemplate(kind)
    expect(template, `${kind} would 400 for older installs`).toBeDefined()
    expect(template!.kind).toBe(kind)
    // The proxy builds its request from this; a shim missing effort would send
    // a Sonnet call with no thinking budget stated.
    expect(modelRequestFields(template!).model).toBeTruthy()
  })

  it('stays out of the live registry, which drives snapshots and the internal page', () => {
    for (const kind of kinds) {
      expect(kind in PROMPTS, `${kind} leaked into PROMPTS`).toBe(false)
      expect(isRetiredKind(kind)).toBe(true)
    }
    expect(Object.keys(RETIRED_PROMPTS).sort()).toEqual(kinds.slice().sort())
  })

  it('a live kind is not reported as retired', () => {
    expect(isRetiredKind('intake.outcomes')).toBe(false)
    expect(getPromptTemplate('intake.outcomes')).toBeDefined()
    expect(getPromptTemplate('nonsense.kind')).toBeUndefined()
  })
})
