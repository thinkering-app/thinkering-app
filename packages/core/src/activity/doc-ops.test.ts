import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import { activityDocSchema } from '../schemas/activity-doc'
import {
  docForReport,
  fillReviewPage,
  insertPageAfter,
  interactiveBlocksBeforeReview,
  lastInteractivePageIndex,
  reviewPageIndex,
  reviewText,
} from './doc-ops'

/** The three post-generation edits a document takes (G6 fill, G7 insert, review trigger). */

describe('doc ops', () => {
  it('fills the reserved review page and leaves a valid document', () => {
    const filled = fillReviewPage(FIXTURE_DOC_INTRODUCE, [
      { kind: 'paragraph', md: 'About your answer…' },
    ])
    const page = filled.pages[reviewPageIndex(filled)]
    expect(page?.blocks).toHaveLength(1)
    expect(activityDocSchema.safeParse(filled).success).toBe(true)
    // The original is untouched — the caller persists what comes back.
    expect(FIXTURE_DOC_INTRODUCE.pages[reviewPageIndex(FIXTURE_DOC_INTRODUCE)]?.blocks).toBeNull()
  })

  it('reads what the review page said, once G6 has filled it', () => {
    expect(reviewText(FIXTURE_DOC_INTRODUCE)).toBeUndefined()
    const filled = fillReviewPage(FIXTURE_DOC_INTRODUCE, [
      { kind: 'paragraph', md: 'You mixed up the example and the rule.' },
    ])
    expect(reviewText(filled)).toBe('You mixed up the example and the rule.')
  })

  it('inserts an Ask page after the current one without breaking the document', () => {
    const doc = insertPageAfter(FIXTURE_DOC_INTRODUCE, 0, {
      id: 'ask-1',
      kind: 'inserted',
      blocks: [{ kind: 'paragraph', md: 'Good question.' }],
    })
    expect(doc.pages[1]?.id).toBe('ask-1')
    expect(doc.pages).toHaveLength(FIXTURE_DOC_INTRODUCE.pages.length + 1)
    expect(activityDocSchema.safeParse(doc).success).toBe(true)
  })

  it('an Ask page inserted just before the review slot is still valid', () => {
    const review = reviewPageIndex(FIXTURE_DOC_INTRODUCE)
    const doc = insertPageAfter(FIXTURE_DOC_INTRODUCE, review, {
      id: 'ask-late',
      kind: 'inserted',
      blocks: [{ kind: 'paragraph', md: 'One more thing.' }],
    })
    expect(activityDocSchema.safeParse(doc).success).toBe(true)
  })

  it("takes the learner's question out of a shared report", () => {
    const doc = insertPageAfter(FIXTURE_DOC_INTRODUCE, 0, {
      id: 'ask-1',
      kind: 'inserted',
      question: 'Why does one example beat ten?',
      blocks: [{ kind: 'paragraph', md: 'Good question.' }],
    })
    const shared = docForReport(doc)
    const page = shared.pages[1]
    expect(page?.kind === 'inserted' && page.question).toBeUndefined()
    expect(JSON.stringify(shared)).not.toContain('Why does one example')
    // The answer still travels; it's ours, not theirs.
    expect(page?.blocks).toEqual([{ kind: 'paragraph', md: 'Good question.' }])
    expect(activityDocSchema.safeParse(shared).success).toBe(true)
  })

  it('finds the last interactive page before the review slot (the G6 trigger)', () => {
    const index = lastInteractivePageIndex(FIXTURE_DOC_INTRODUCE)
    expect(index).toBe(reviewPageIndex(FIXTURE_DOC_INTRODUCE) - 1)
    expect(interactiveBlocksBeforeReview(FIXTURE_DOC_INTRODUCE).map((b) => b.block.kind)).toEqual([
      'mcq',
      'reveal',
      'mcq',
    ])
  })
})
