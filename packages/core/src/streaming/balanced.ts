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

/**
 * Extracts the complete, balanced top-level `{…}` substrings from an array body,
 * stopping at the array's closing bracket. A trailing half-written object is
 * simply absent — that's the point.
 */
export function balancedObjects(text: string): string[] {
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
      break // end of the array
    }
  }
  return objects
}

/** Reads a string field out of a partial document head, unescaping it. */
export function matchStringField(text: string, key: string): string | undefined {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  return m ? (JSON.parse(`"${m[1]}"`) as string) : undefined
}
