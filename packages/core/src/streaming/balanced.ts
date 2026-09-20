/**
 * Scanning helpers for incremental JSON parsing (docs/04 §Latency): streamed
 * generations render as soon as the array element they're waiting on closes,
 * rather than when the whole document does. Shared by the Activity Document
 * (G5b) and path (G3) extractors.
 */

/** Character index just after `"<key>"` `:` `[`, or -1 if the array hasn't opened yet. */
export function findArrayStart(text: string, key: string): number {
  const at = text.indexOf(`"${key}"`)
  if (at === -1) return -1
  const bracket = text.indexOf('[', at)
  return bracket === -1 ? -1 : bracket + 1
}

export interface ArrayScan {
  /** The complete, balanced top-level `{…}` substrings seen so far. */
  objects: string[]
  /** The array's own `]` arrived: `objects` is all of it, and nothing more is coming. */
  closed: boolean
}

/**
 * Scans an array body, reporting both its finished objects and whether the
 * array has closed. A caller that only renders what has arrived wants the
 * objects; one that has to decide "is this all of them?" needs `closed`, and
 * must not infer it from whatever follows the array in the document.
 */
export function scanArrayObjects(text: string): ArrayScan {
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
      return { objects, closed: true } // end of the array
    }
  }
  return { objects, closed: false }
}

/**
 * Extracts the complete, balanced top-level `{…}` substrings from an array body,
 * stopping at the array's closing bracket. A trailing half-written object is
 * simply absent — that's the point.
 */
export function balancedObjects(text: string): string[] {
  return scanArrayObjects(text).objects
}

/** Reads a string field out of a partial document head, unescaping it. */
export function matchStringField(text: string, key: string): string | undefined {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  return m ? (JSON.parse(`"${m[1]}"`) as string) : undefined
}
