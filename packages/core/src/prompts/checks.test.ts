import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import type { ActivityDoc } from '../schemas/activity-doc'
import type { ResourceDraft } from '../schemas/generations'
import {
  checkActivityDoc,
  checkResources,
  pageCountRange,
  toneLintIssues,
  type ResourceExpectations,
} from './checks'

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

describe('checkResources', () => {
  const GOALS = ['Order food and drinks', 'Talk about your family']
  const article = (over: Partial<ResourceDraft> = {}): ResourceDraft => ({
    url: 'https://learngerman.dw.com/en/nicos-weg/c-36519231',
    title: 'Nicos Weg',
    description: 'A free video course.',
    howToUse: 'Watch one episode, then describe your own family.',
    summary: 'A serial German course from Deutsche Welle.',
    goalTitles: ['Talk about your family'],
    ...over,
  })
  const video = (over: Partial<ResourceDraft> = {}): ResourceDraft =>
    article({
      url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
      title: 'Ordering at a cafe',
      goalTitles: ['Order food and drinks'],
      ...over,
    })

  /** G4 seeds exactly two, one of each medium; G12 ranges wider when asked. */
  const SEED: ResourceExpectations = {
    goalTitles: GOALS,
    count: { min: 2, max: 2 },
    mediaSplit: true,
  }
  const MORE: ResourceExpectations = { goalTitles: GOALS, count: { min: 2, max: 4 } }
  const checks = (resources: ResourceDraft[], expected: ResourceExpectations = SEED) =>
    checkResources({ resources }, expected).map((i) => i.check)

  it('passes the seeded pair: one video, one article, different sites', () => {
    expect(checkResources({ resources: [video(), article()] }, SEED)).toEqual([])
  })

  it('holds each kind to its own count, which the shared schema leaves slack around', () => {
    expect(checks([video()])).toContain('count')
    expect(checks([video(), article(), article({ url: 'https://example.com/a' })])).toContain(
      'count',
    )
    // The same three are fine for G12, which was asked for more.
    expect(
      checks([video(), article(), article({ url: 'https://example.com/a' })], MORE),
    ).not.toContain('count')
  })

  /**
   * watch-along wants a video and guided-reading wants an article; pickResource
   * falls back to whatever is saved, so two articles turn every Watch Along
   * into a reading rather than failing visibly.
   */
  it('flags a seeded pair that cannot serve both early activity types', () => {
    expect(checks([article(), article({ url: 'https://example.com/guide' })])).toContain(
      'media-split',
    )
    expect(
      checks([video(), video({ url: 'https://www.youtube.com/watch?v=otherVideo1' })]),
    ).toContain('media-split')
    // G12 isn't seeding the early pair, so it carries no such requirement.
    expect(checks([article(), article({ url: 'https://example.com/guide' })], MORE)).not.toContain(
      'media-split',
    )
  })

  it('flags a second resource from a site already used', () => {
    expect(
      checks([video(), article(), article({ url: 'https://learngerman.dw.com/en/grammar' })], MORE),
    ).toContain('variety')
  })

  /**
   * A channel or homepage can't be played or quoted inside an activity
   * (groundBlocks degrades both to a plain link), so it isn't worth a slot.
   */
  it('flags a hub where a specific page was asked for', () => {
    expect(checks([article({ url: 'https://www.youtube.com/@easygerman' }), article()])).toContain(
      'specific',
    )
    expect(
      checks([article({ url: 'https://www.youtube.com/playlist?list=PL1234567890' }), article()]),
    ).toContain('specific')
    expect(checks([article({ url: 'https://example.com/' }), video()])).toContain('specific')
  })

  /** Find more means more: handing back a saved URL is a wasted search. */
  it('flags a resource the search was told they already have', () => {
    const saved = 'https://learngerman.dw.com/en/nicos-weg/c-36519231'
    expect(checks([video(), article()], { ...MORE, excludeUrls: [saved] })).toContain('duplicate')
    expect(checks([video(), article()], MORE)).not.toContain('duplicate')
  })

  it('accepts a goal title the client will match, and flags one it will drop', () => {
    expect(checks([video(), article({ goalTitles: [] })])).not.toContain('goal-titles')
    expect(checks([video(), article({ goalTitles: ['Talk about your familiy'] })])).toContain(
      'goal-titles',
    )
  })
})
