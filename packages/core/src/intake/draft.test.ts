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
    outcomes: { key: '{}', value: { outcomes: ['I can order food', 'I can chat', 'I can read'] } },
    topics: {
      key: '{}',
      value: {
        topics: [
          {
            label: 'Family introductions',
            origin: 'motivation',
            blurb: 'Who you are, and asking back.',
          },
          {
            label: 'Talking about food',
            origin: 'motivation',
            blurb: 'Dishes, preferences, compliments.',
          },
          {
            label: 'Present tense verbs',
            origin: 'foundational',
            blurb: 'The everyday verb forms.',
          },
          {
            label: 'Noun genders',
            origin: 'foundational',
            blurb: 'Der, die, das and how to cope.',
          },
          { label: 'Numbers and time', origin: 'foundational', blurb: 'Saying when and how many.' },
          {
            label: 'German TV and music',
            origin: 'adjacent',
            blurb: 'Listening for pleasure, not study.',
          },
        ],
      },
    },
    updatedAt: 0,
  }

  it('reads back what was written', () => {
    expect(parseIntakeDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
  })

  it('keeps the answers of a draft saved before G2 was split, and asks again', () => {
    const { outcomes, topics, ...rest } = draft
    const before = {
      ...rest,
      choices: { key: '{}', value: { ...outcomes!.value, ...topics!.value } },
    }
    expect(parseIntakeDraft(before)).toEqual(rest)
  })

  it('keeps the answers of a draft saved before the approach brief grew, and asks again', () => {
    const before = {
      ...draft,
      approach: {
        key: '{}',
        value: {
          domain: 'language acquisition',
          approachNotes: 'Hear German at your level, then say your own sentences.',
          pitfalls: ['Reading fluency mistaken for speaking fluency'],
          progressionPrinciples: ['Social phrases before grammar rules'],
        },
      },
    }
    expect(parseIntakeDraft(before)).toEqual(draft)
  })

  it('drops a draft whose stored generation no longer fits its schema', () => {
    // Too few topics for the schema: the whole draft goes rather than a
    // half-trusted one.
    const thin = { key: '{}', value: { topics: [] } }
    expect(parseIntakeDraft({ ...draft, topics: thin })).toBe(undefined)
    expect(parseIntakeDraft({ answers: {}, step: 1, updatedAt: 0 })).toBe(undefined)
    expect(parseIntakeDraft(undefined)).toBe(undefined)
  })
})
