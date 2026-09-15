import { pageSchema, type Page } from '../schemas/activity-doc'
import { balancedObjects, findArrayStart, matchStringField } from './balanced'

/**
 * Incremental Activity Document parsing (docs/04 §Latency): as G5b streams,
 * each page renders as soon as its JSON object closes. This extracts the
 * complete pages (and top-level metadata) from a *partial* JSON document
 * without waiting for the stream to finish. Pages are schema-validated
 * individually — an invalid page stops extraction at that point.
 */

export interface PartialActivityDoc {
  title?: string
  estMinutes?: number
  tier?: string
  libraryItemId?: string
  pages: Page[]
}

export function extractPartialActivityDoc(text: string): PartialActivityDoc {
  const result: PartialActivityDoc = { pages: [] }
  const pagesStart = findArrayStart(text, 'pages')

  // Top-level scalar fields usually stream before the pages array.
  const head = text.slice(0, pagesStart === -1 ? text.length : pagesStart)
  result.title = matchStringField(head, 'title')
  result.libraryItemId = matchStringField(head, 'libraryItemId')
  const est = head.match(/"estMinutes"\s*:\s*(\d+)/)
  if (est) result.estMinutes = Number(est[1])
  const tier = head.match(/"tier"\s*:\s*"(\w+)"/)
  if (tier) result.tier = tier[1]

  if (pagesStart === -1) return result

  for (const objectText of balancedObjects(text.slice(pagesStart))) {
    let value: unknown
    try {
      value = JSON.parse(objectText)
    } catch {
      break
    }
    const page = pageSchema.safeParse(value)
    if (!page.success) break
    result.pages.push(page.data)
  }
  return result
}
