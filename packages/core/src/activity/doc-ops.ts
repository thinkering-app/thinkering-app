import type { ActivityDoc, Page } from '../schemas/activity-doc'
import type { Block } from '../schemas/blocks'
import { isInteractiveBlock } from '../schemas/blocks'

/**
 * The three ways a document changes after G5b wrote it (docs/05): G6 fills the
 * reserved review page, G7 inserts a page after the current one, and the player
 * asks whether the review call is due yet. Pure — the caller persists the
 * returned document.
 */

export function reviewPageIndex(doc: ActivityDoc): number {
  return doc.pages.findIndex((p) => p.kind === 'review')
}

/** Fills the reserved review page with G6's blocks. */
export function fillReviewPage(doc: ActivityDoc, blocks: Block[]): ActivityDoc {
  const index = reviewPageIndex(doc)
  if (index === -1 || blocks.length === 0) return doc
  const pages = [...doc.pages]
  pages[index] = { ...(pages[index] as Extract<Page, { kind: 'review' }>), blocks }
  return { ...doc, pages }
}

/** G7 (Ask): a new page directly after `index`; the progress bar grows by one. */
export function insertPageAfter(doc: ActivityDoc, index: number, page: Page): ActivityDoc {
  const pages = [...doc.pages]
  pages.splice(Math.min(index + 1, pages.length), 0, page)
  return { ...doc, pages }
}

/**
 * G6 fires when the learner finishes the last interactive block before the
 * review page (docs/05) — in practice, when they leave the last page that has
 * one. Pages after the review slot (summary, inserted) don't count.
 */
export function lastInteractivePageIndex(doc: ActivityDoc): number {
  const review = reviewPageIndex(doc)
  const limit = review === -1 ? doc.pages.length : review
  for (let i = limit - 1; i >= 0; i--) {
    if (doc.pages[i]!.blocks?.some(isInteractiveBlock)) return i
  }
  return -1
}

/**
 * The document as it may leave the device in a shared activity report (D18,
 * docs/08): generated content only. An Ask page keeps the question the learner
 * typed so the page still reads as a reply, and a report promises that nothing
 * they wrote is included — so it comes off here, on the way out.
 */
export function docForReport(doc: ActivityDoc): ActivityDoc {
  return {
    ...doc,
    pages: doc.pages.map((page) => {
      if (page.kind !== 'inserted' || page.question === undefined) return page
      return { id: page.id, kind: page.kind, blocks: page.blocks }
    }),
  }
}

/** Every interactive block in the pages before the review slot, in reading order. */
export function interactiveBlocksBeforeReview(
  doc: ActivityDoc,
): { pageId: string; block: Block }[] {
  const review = reviewPageIndex(doc)
  const limit = review === -1 ? doc.pages.length : review
  return doc.pages
    .slice(0, limit)
    .flatMap((page) =>
      (page.blocks ?? []).filter(isInteractiveBlock).map((block) => ({ pageId: page.id, block })),
    )
}
