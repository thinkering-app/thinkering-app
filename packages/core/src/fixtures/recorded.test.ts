import { describe, expect, it } from 'vitest'
import { PROMPTS } from '../prompts/registry'
import { RECORDED_RESPONSES } from './recorded'

/** Every bundled recording must satisfy its kind's output schema — recorded or hand-authored. */
describe('recorded fixtures', () => {
  it.each(Object.keys(RECORDED_RESPONSES))('%s parses against its output schema', (kind) => {
    const recorded = RECORDED_RESPONSES[kind]!
    const template = PROMPTS[kind as keyof typeof PROMPTS]
    expect(template, `no template for recorded kind ${kind}`).toBeDefined()
    const result = template.outputSchema.safeParse(JSON.parse(recorded.text))
    expect(result.success, JSON.stringify(!result.success && result.error.issues.slice(0, 5))).toBe(true)
  })
})
