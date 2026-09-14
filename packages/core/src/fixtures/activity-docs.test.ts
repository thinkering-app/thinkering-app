import { describe, expect, it } from 'vitest'
import { getLibraryItem } from '../library/items'
import { parseActivityDoc } from '../schemas/activity-doc'
import { FIXTURE_ACTIVITY_DOCS } from './activity-docs'

describe('fixture activity docs', () => {
  it.each(Object.entries(FIXTURE_ACTIVITY_DOCS))('%s doc passes the validation boundary', (tier, doc) => {
    const result = parseActivityDoc(JSON.parse(JSON.stringify(doc)), {
      goalConceptIds: doc.concepts.map((c) => c.goalConceptId!).filter(Boolean),
    })
    expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true)
    expect(doc.tier).toBe(tier)
    expect(getLibraryItem(doc.libraryItemId), doc.libraryItemId).toBeDefined()
  })
})
