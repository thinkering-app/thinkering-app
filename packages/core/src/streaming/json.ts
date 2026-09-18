/**
 * Model output is asked for as a bare JSON object (see the shared preamble's
 * output contract), but models — Haiku especially — sometimes wrap it in a
 * markdown fence anyway, a kind that runs with the web-search tool (G4)
 * narrates its searches before answering, and now and then a string value
 * carries a raw line break, which JSON forbids. All three are handled here, at
 * the one place every response passes through, saving a repair round-trip per
 * call.
 */
const FENCE = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/

export function extractJsonText(text: string): string {
  const fenced = FENCE.exec(text)
  const stripped = (fenced ? fenced[1]! : text).trim()
  if (stripped.startsWith('{') || stripped.startsWith('[')) return escapeRawControlChars(stripped)
  // Prose around the object: take the largest balanced top-level object, which
  // survives both a stray brace in the narration and trailing commentary.
  return escapeRawControlChars(largestBalancedObject(stripped) ?? stripped)
}

/**
 * A control character inside a string can only have meant itself, so it is
 * escaped rather than rejected; outside strings it's whitespace and left alone.
 */
function escapeRawControlChars(json: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (const ch of json) {
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      else if (ch < ' ') {
        const named: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' }
        out += named[ch] ?? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
        continue
      }
    } else if (ch === '"') inString = true
    out += ch
  }
  return out
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
