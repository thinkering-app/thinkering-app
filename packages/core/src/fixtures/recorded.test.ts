import { describe, expect, it } from 'vitest'
import { PROMPTS } from '../prompts/registry'
import { extractJsonText } from '../streaming/json'
import { RECORDED_RESPONSES } from './recorded'

const KINDS = Object.keys(RECORDED_RESPONSES)

function schemaFor(kind: string) {
  const template = PROMPTS[kind as keyof typeof PROMPTS]
  expect(template, `no template for recorded kind ${kind}`).toBeDefined()
  return template.outputSchema
}

/** The client's path for a model response: extract the JSON, parse it, validate it. */
function accepts(kind: string, text: string): boolean {
  let json: unknown
  try {
    json = JSON.parse(extractJsonText(text))
  } catch {
    return false
  }
  return schemaFor(kind).safeParse(json).success
}

/** Every bundled recording must satisfy its kind's output schema — recorded or hand-authored. */
describe('recorded fixtures', () => {
  it.each(KINDS)('%s parses against its output schema', (kind) => {
    const recorded = RECORDED_RESPONSES[kind]!
    const result = schemaFor(kind).safeParse(JSON.parse(extractJsonText(recorded.text)))
    expect(result.success, JSON.stringify(!result.success && result.error.issues.slice(0, 5))).toBe(true)
  })
})

/**
 * The malformed-output check every kind gets (docs/10 Tier 1): its recording,
 * broken the ways model output actually breaks, must not get through. Cut-off
 * output matters beyond JSON.parse, because extraction salvages the largest
 * balanced object — which must never be a fragment the schema would accept.
 * activity.generate has no recording; its fuller corpus is fixtures/malformed.
 */
describe('malformed output', () => {
  it.each(KINDS)('%s rejects its recording cut off partway', (kind) => {
    const text = RECORDED_RESPONSES[kind]!.text
    for (const fraction of [0.25, 0.5, 0.75, 0.95]) {
      const cut = text.slice(0, Math.floor(text.length * fraction))
      expect(accepts(kind, cut), `accepted the first ${fraction * 100}%`).toBe(false)
    }
  })

  it.each(KINDS)('%s rejects an empty object', (kind) => {
    expect(accepts(kind, '{}')).toBe(false)
  })
})
