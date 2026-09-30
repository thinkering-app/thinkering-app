import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseActivityDoc } from './activity-doc'

const GOAL_CONCEPT_IDS = ['c-tokens', 'c-embeddings']

/** Loosely typed on purpose: tests mutate pages/blocks to build invalid variants. */
interface LooseDoc {
  version: number
  title: string
  estMinutes: number
  tier: string
  libraryItemId: string
  concepts: { goalConceptId?: string; label: string }[]
  pages: { id: string; kind: string; blocks: unknown[] | null }[]
}

function validDoc(): LooseDoc {
  return {
    version: 1,
    title: 'Tokens, not words',
    estMinutes: 5,
    tier: 'introduce',
    libraryItemId: 'plain-explainer',
    concepts: [{ goalConceptId: 'c-tokens', label: 'Tokenization' }],
    pages: [
      {
        id: 'p1',
        kind: 'content',
        blocks: [
          { kind: 'paragraph', md: 'Models read tokens, not words.' },
          {
            kind: 'mcq',
            id: 'q1',
            prompt: 'Roughly how long is a token?',
            options: [
              { id: 'a', label: 'One character' },
              { id: 'b', label: 'About three-quarters of a word' },
            ],
            correctId: 'b',
          },
        ],
      },
      { id: 'p2', kind: 'review', blocks: null },
      {
        id: 'p3',
        kind: 'summary',
        blocks: [{ kind: 'paragraph', md: 'Tokens are the unit of cost.' }],
      },
    ],
  }
}

describe('parseActivityDoc', () => {
  it('accepts a valid document (object or JSON string)', () => {
    expect(parseActivityDoc(validDoc(), { goalConceptIds: GOAL_CONCEPT_IDS }).ok).toBe(true)
    expect(
      parseActivityDoc(JSON.stringify(validDoc()), { goalConceptIds: GOAL_CONCEPT_IDS }).ok,
    ).toBe(true)
  })

  it('accepts a filled review page and inserted (Ask) pages between review and summary', () => {
    const doc = validDoc()
    doc.pages[1]!.blocks = [
      { kind: 'paragraph', md: 'Your answer on token length was right — here is the edge case.' },
    ]
    doc.pages.splice(2, 0, {
      id: 'ask1',
      kind: 'inserted',
      blocks: [
        { kind: 'paragraph', md: 'Good question — byte-pair encoding merges frequent pairs.' },
      ],
    })
    expect(parseActivityDoc(doc).ok).toBe(true)
  })

  it('rejects a non-inserted page between review and summary', () => {
    const doc = validDoc()
    doc.pages.splice(2, 0, {
      id: 'px',
      kind: 'content',
      blocks: [
        { kind: 'paragraph', md: 'stray page' },
        { kind: 'freeText', id: 'f1', prompt: 'why?' },
      ],
    })
    const result = parseActivityDoc(doc)
    expect(result.ok).toBe(false)
  })

  it('rejects a resource link that is not a web page', () => {
    const embed = (url: string) => {
      const doc = validDoc()
      doc.pages[0]!.blocks!.push({ kind: 'resourceEmbed', url, media: 'article', title: 'A page' })
      return parseActivityDoc(doc).ok
    }
    expect(embed('https://example.com/tokens')).toBe(true)
    expect(embed('javascript:alert(1)')).toBe(false)
    expect(embed('data:text/html,<p>hi</p>')).toBe(false)
  })

  it('rejects duplicate page ids', () => {
    const doc = validDoc()
    doc.pages[1]!.id = 'p1'
    expect(parseActivityDoc(doc).ok).toBe(false)
  })

  describe('malformed corpus — every committed sample fails with a useful issue', () => {
    const corpusDir = join(__dirname, '../../fixtures/malformed/activity-doc')
    const files = readdirSync(corpusDir).filter((f) => f !== 'README.md')

    it('covers the corpus', () => {
      expect(files.length).toBeGreaterThanOrEqual(6)
    })

    it.each(files)('%s', (file) => {
      const raw = readFileSync(join(corpusDir, file), 'utf8')
      const result = parseActivityDoc(raw, { goalConceptIds: GOAL_CONCEPT_IDS })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.length).toBeGreaterThan(0)
        for (const issue of result.issues) expect(issue.message).toBeTruthy()
      }
    })
  })
})
