import { describe, expect, it } from 'vitest'
import {
  EMPTY_INTAKE_ANSWERS,
  furthestIntakeStep,
  parseIntakeDraft,
  resumeIntakeStep,
  type IntakeAnswers,
  type IntakeDraft,
} from './draft'

const ANSWERED: IntakeAnswers = {
  ...EMPTY_INTAKE_ANSWERS,
  wantToLearn: 'Get back into Spanish',
  whyChoice: 'personal_goal',
  experienceChoice: 'explored',
  frequency: 'daily',
  sessionMinutes: 10,
}

describe('resumeIntakeStep', () => {
  it('returns to the step they were on when the answers allow it', () => {
    expect(resumeIntakeStep({ answers: ANSWERED, step: 5 })).toBe(5)
    expect(resumeIntakeStep({ answers: ANSWERED, step: 7 })).toBe(7)
  })

  it('stops at the first required answer that is missing', () => {
    const noExperience = { ...ANSWERED, experienceChoice: null }
    expect(resumeIntakeStep({ answers: noExperience, step: 7 })).toBe(3)
    // Topics and success need no answer; time does.
    const noTime = { ...ANSWERED, sessionMinutes: null }
    expect(furthestIntakeStep(noTime)).toBe(6)
    expect(resumeIntakeStep({ answers: noTime, step: 5 })).toBe(5)
  })

  it('treats blank text as unanswered', () => {
    expect(furthestIntakeStep({ ...ANSWERED, wantToLearn: '  ' })).toBe(1)
  })
})

describe('parseIntakeDraft', () => {
  const draft: IntakeDraft = {
    answers: ANSWERED,
    step: 4,
    success: { key: '{}', value: { outcomes: ['I can order food', 'I can chat', 'I can read'] } },
    updatedAt: 0,
  }

  it('reads back what was written', () => {
    expect(parseIntakeDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
  })

  it('drops a draft whose stored generation no longer fits its schema', () => {
    expect(parseIntakeDraft({ ...draft, success: { key: '{}', value: { outcomes: [] } } })).toBe(
      undefined,
    )
    expect(parseIntakeDraft({ answers: {}, step: 1, updatedAt: 0 })).toBe(undefined)
    expect(parseIntakeDraft(undefined)).toBe(undefined)
  })
})
