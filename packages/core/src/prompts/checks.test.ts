import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import type { ActivityDoc } from '../schemas/activity-doc'
import { checkActivityDoc, pageCountRange, toneLintIssues } from './checks'

const GOAL_CONCEPTS = ['c-prompt-clear', 'c-prompt-fewshot']

function freshDoc(): ActivityDoc {
  return JSON.parse(JSON.stringify(FIXTURE_DOC_INTRODUCE)) as ActivityDoc
}

describe('checkActivityDoc', () => {
  it('passes a well-formed freshly generated doc', () => {
    const issues = checkActivityDoc(freshDoc(), {
      estMinutes: 5,
      goalConceptIds: GOAL_CONCEPTS,
      libraryItemId: 'plain-explainer',
    })
    expect(issues).toEqual([])
  })

  it('asks for concept coverage only when the goal has concepts to cover', () => {
    const uncovered = freshDoc()
    uncovered.concepts = uncovered.concepts.map(({ goalConceptId: _, ...c }) => c)
    const checks = (goalConceptIds: string[]) =>
      checkActivityDoc(uncovered, { estMinutes: 5, goalConceptIds }).map((i) => i.check)
    expect(checks(GOAL_CONCEPTS)).toContain('concepts')
    // A goal-less card: the prerequisite fallback, or a request with no goal.
    expect(checks([])).not.toContain('concepts')
  })

  it('flags a filled review page on fresh generation and a misplaced review', () => {
    const filled = freshDoc()
    const review = filled.pages.find((p) => p.kind === 'review')!
    review.blocks = [{ kind: 'paragraph', md: 'premature feedback' }]
    expect(
      checkActivityDoc(filled, { estMinutes: 5, goalConceptIds: GOAL_CONCEPTS }).map(
        (i) => i.check,
      ),
    ).toContain('review-empty')
  })

  it('flags page counts outside the range for the session length', () => {
    expect(pageCountRange(5)).toEqual({ min: 3, max: 7 })
    expect(pageCountRange(15)).toEqual({ min: 3, max: 11 })
    const doc = freshDoc()
    // Duplicate content pages until over the 5-minute max.
    while (doc.pages.length <= 8) {
      const clone = JSON.parse(JSON.stringify(doc.pages[0])) as ActivityDoc['pages'][number]
      clone.id = `dup-${doc.pages.length}`
      doc.pages.unshift(clone)
    }
    expect(
      checkActivityDoc(doc, { estMinutes: 5, goalConceptIds: GOAL_CONCEPTS }).map((i) => i.check),
    ).toContain('page-count')
  })

  it('flags unknown goal concept ids and zero declared coverage', () => {
    const doc = freshDoc()
    doc.concepts = [{ goalConceptId: 'c-imaginary', label: 'Made up' }]
    const checks = checkActivityDoc(doc, { estMinutes: 5, goalConceptIds: GOAL_CONCEPTS }).map(
      (i) => i.check,
    )
    expect(checks).toContain('concepts')
  })

  it('tone lints catch filler praise and patronizing framings', () => {
    expect(toneLintIssues('Great job! You nailed it', 'x')).not.toEqual([])
    expect(toneLintIssues("you haven't learned subjunctive yet", 'x')).not.toEqual([])
    expect(toneLintIssues("In thinkering you've covered greetings and ordering.", 'x')).toEqual([])
  })
})
