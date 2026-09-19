/**
 * Model output is asked for as a bare JSON object (see the shared preamble's
 * output contract), but models — Haiku especially — sometimes wrap it in a
 * markdown fence anyway, a kind that runs with the web-search tool (G4)
 * narrates its searches before answering, and now and then a string value
 * carries a raw line break, which JSON forbids, or quotes a phrase with a
 * straight double quote it didn't escape (Chinese text especially). All of
 * these are handled here, at the one place every response passes through,
 * saving a repair round-trip per call.
 */
const FENCE = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/

export function extractJsonText(text: string): string {
  const fenced = FENCE.exec(text)
  const stripped = (fenced ? fenced[1]! : text).trim()
  if (stripped.startsWith('{') || stripped.startsWith('[')) return escapeStrayStringChars(stripped)
  // Prose around the object: take the largest balanced top-level object, which
  // survives both a stray brace in the narration and trailing commentary.
  return escapeStrayStringChars(largestBalancedObject(stripped) ?? stripped)
}

/**
 * Escapes what a string can't hold raw but can only have meant as itself. A
 * control character inside a string is escaped rather than rejected; outside
 * strings it's whitespace and left alone. A double quote inside a string that
 * isn't followed by `,` `}` `]` `:` or the end can't be the string's close, so
 * it's a quotation mark in the text. Valid JSON has neither, so it passes
 * through unchanged.
 */
function escapeStrayStringChars(json: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') {
        if (!closesString(json, i)) {
          out += '\\"'
          continue
        }
        inString = false
      } else if (ch < ' ') {
        const named: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' }
        out += named[ch] ?? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
        continue
      }
    } else if (ch === '"') inString = true
    out += ch
  }
  return out
}

function closesString(json: string, quoteIndex: number): boolean {
  for (let i = quoteIndex + 1; i < json.length; i++) {
    const ch = json[i]!
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue
    return ch === ',' || ch === '}' || ch === ']' || ch === ':'
  }
  return true
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
