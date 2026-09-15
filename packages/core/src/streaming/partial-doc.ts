import { pageSchema, type Page } from '../schemas/activity-doc'

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

/** Finds the character index right after `"pages"` `:` `[`, or -1. */
function findPagesArrayStart(text: string): number {
  const key = text.indexOf('"pages"')
  if (key === -1) return -1
  const bracket = text.indexOf('[', key)
  return bracket === -1 ? -1 : bracket + 1
}

/** Extracts balanced top-level `{…}` object substrings from an array body. */
function balancedObjects(text: string): string[] {
  const objects: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(text.slice(start, i + 1))
        start = -1
      }
    } else if (ch === ']' && depth === 0) {
      break // end of the pages array
    }
  }
  return objects
}

export function extractPartialActivityDoc(text: string): PartialActivityDoc {
  const result: PartialActivityDoc = { pages: [] }

  // Top-level scalar fields usually stream before the pages array.
  const head = text.slice(0, findPagesArrayStart(text) === -1 ? text.length : findPagesArrayStart(text))
  const title = head.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (title) result.title = JSON.parse(`"${title[1]}"`) as string
  const est = head.match(/"estMinutes"\s*:\s*(\d+)/)
  if (est) result.estMinutes = Number(est[1])
  const tier = head.match(/"tier"\s*:\s*"(\w+)"/)
  if (tier) result.tier = tier[1]
  const item = head.match(/"libraryItemId"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (item) result.libraryItemId = JSON.parse(`"${item[1]}"`) as string

  const pagesStart = findPagesArrayStart(text)
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
