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
    // Topics and outcomes need no answer; time does.
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
    choices: {
      key: '{}',
      value: {
        topics: [
        { label: 'Family introductions', origin: 'motivation', blurb: 'Who you are, and asking back.' },
        { label: 'Talking about food', origin: 'motivation', blurb: 'Dishes, preferences, compliments.' },
        { label: 'Present tense verbs', origin: 'foundational', blurb: 'The everyday verb forms.' },
        { label: 'Noun genders', origin: 'foundational', blurb: 'Der, die, das and how to cope.' },
        { label: 'Numbers and time', origin: 'foundational', blurb: 'Saying when and how many.' },
        { label: 'German TV and music', origin: 'adjacent', blurb: 'Listening for pleasure, not study.' },
      ],
        outcomes: ['I can order food', 'I can chat', 'I can read'],
      },
    },
    updatedAt: 0,
  }

  it('reads back what was written', () => {
    expect(parseIntakeDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
  })

  it('drops a draft whose stored generation no longer fits its schema', () => {
    // Too few topics for the schema: the whole draft goes rather than a
    // half-trusted one.
    const thin = { key: '{}', value: { ...draft.choices!.value, topics: [] } }
    expect(parseIntakeDraft({ ...draft, choices: thin })).toBe(undefined)
    expect(parseIntakeDraft({ answers: {}, step: 1, updatedAt: 0 })).toBe(undefined)
    expect(parseIntakeDraft(undefined)).toBe(undefined)
  })
})
