/**
 * Model output is asked for as a bare JSON object (see the shared preamble's
 * output contract), but models — Haiku especially — sometimes wrap it in a
 * markdown fence anyway. Stripping it here, at the one place every response
 * passes through, saves a repair round-trip on every affected call.
 */
const FENCE = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/

export function extractJsonText(text: string): string {
  const fenced = FENCE.exec(text)
  return (fenced ? fenced[1]! : text).trim()
}
