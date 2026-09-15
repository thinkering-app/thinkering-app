/**
 * Model output is asked for as a bare JSON object (see the shared preamble's
 * output contract), but models — Haiku especially — sometimes wrap it in a
 * markdown fence anyway, and a kind that runs with the web-search tool (G4)
 * narrates its searches before answering. Both are handled here, at the one
 * place every response passes through, saving a repair round-trip per call.
 */
const FENCE = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/

export function extractJsonText(text: string): string {
  const fenced = FENCE.exec(text)
  const stripped = (fenced ? fenced[1]! : text).trim()
  if (stripped.startsWith('{') || stripped.startsWith('[')) return stripped
  // Prose around the object: take the largest balanced top-level object, which
  // survives both a stray brace in the narration and trailing commentary.
  return largestBalancedObject(stripped) ?? stripped
}

function largestBalancedObject(text: string): string | undefined {
  let best: string | undefined
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
    } else if (ch === '}' && depth > 0 && --depth === 0) {
      const candidate = text.slice(start, i + 1)
      if (!best || candidate.length > best.length) best = candidate
    }
  }
  return best
}
