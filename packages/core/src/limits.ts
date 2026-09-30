import { z } from 'zod'

/**
 * How much a learner can write in each kind of field, in characters. The app
 * enforces these where people type — a counter near the limit, sending held
 * back past it — so nothing a learner writes is cut without them seeing it.
 */
export const TEXT_LIMITS = {
  /** Names, titles, labels, topics, outcomes: a line. */
  line: 200,
  /** What they want to learn. */
  wantToLearn: 500,
  /** Why, experience, focus, a question, a routine request, a description or note. */
  note: 2_000,
  /** Where people write at length: a reflection, an answer in an activity. */
  long: 5_000,
} as const

export type TextLimit = keyof typeof TEXT_LIMITS

/** The counter shows from this share of the limit; below it the field is quiet. */
export const TEXT_LIMIT_COUNTER_FROM = 0.9

export function isOverLimit(text: string, limit: TextLimit): boolean {
  return text.length > TEXT_LIMITS[limit]
}

/**
 * The proxy's own ceiling on the same fields: twice the app's, so the real app
 * never meets it. Past it a string is trimmed rather than refused — the only
 * text that long is a script's, or a learner's from before the app had limits,
 * and trimming the copy sent to the model keeps the second one working.
 */
export const SERVER_LIMIT_FACTOR = 2

/** A string param from a learner-written field, bounded by the server ceiling for it. */
export function cappedText(limit: TextLimit, opts: { min?: number } = {}) {
  return trimmedText(TEXT_LIMITS[limit] * SERVER_LIMIT_FACTOR, opts)
}

/** A string param no learner types (page text, model-written text), trimmed at `max` characters. */
export function trimmedText(max: number, { min = 0 }: { min?: number } = {}) {
  return z
    .string()
    .min(min)
    .transform((s) => (s.length > max ? s.slice(0, max) : s))
}
