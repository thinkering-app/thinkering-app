import { describe, expect, it } from 'vitest'
import { RECORDED_RESPONSES } from '../fixtures/recorded'
import { approachBriefSchema, approachOutputSchema, splitApproach } from './generations'

describe('splitApproach', () => {
  it('keeps the editable notes out of the hidden brief', () => {
    const output = approachOutputSchema.parse(
      JSON.parse(RECORDED_RESPONSES['intake.approach']!.text),
    )
    const { approachNotes, approachBrief } = splitApproach(output)

    expect(approachNotes).toBe(output.approachNotes)
    expect(approachBrief).not.toHaveProperty('approachNotes')
    expect(approachBriefSchema.strict().parse(approachBrief)).toEqual(approachBrief)
  })
})
