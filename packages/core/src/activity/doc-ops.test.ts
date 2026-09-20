import { describe, expect, it } from 'vitest'
import { FIXTURE_DOC_INTRODUCE } from '../fixtures/activity-docs'
import { activityDocSchema } from '../schemas/activity-doc'
import {
  fillReviewPage,
  insertPageAfter,
  interactiveBlocksBeforeReview,
  lastInteractivePageIndex,
  reviewPageIndex,
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
