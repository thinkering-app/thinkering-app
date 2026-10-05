import { z } from 'zod'
import { EXPERIENCE_CHOICES, FREQUENCIES, READING_AMOUNTS, WHY_CHOICES } from '../domain'
import {
  approachOutputSchema,
  outcomesOutputSchema,
  pathOutputSchema,
  topicOptionsOutputSchema,
} from '../schemas/generations'

/**
 * An intake that hasn't finished yet (docs/01 §1): the answers so far, the step
 * they were on, and the generations that already came back, so picking it up
 * again costs no second call. Kept in local settings only, never synced.
 *
 * Read back through `parseIntakeDraft`: a draft written by an older build, or
 * a generation that no longer fits its schema, is dropped rather than trusted.
 */

/** The seven questions of docs/01 §1; the welcome screen ahead of them isn't one. */
const INTAKE_STEP_TOTAL = 7

export const intakeAnswersSchema = z.object({
  wantToLearn: z.string(),
  whyChoice: z.enum(WHY_CHOICES).nullable(),
  whyText: z.string(),
  experienceChoice: z.enum(EXPERIENCE_CHOICES).nullable(),
  experienceText: z.string(),
  /** Topics they wrote on step 5. */
  customTopics: z.array(z.string()),
  /** Topic labels selected on step 5, generated or their own; selecting none is allowed. */
  selectedTopics: z.array(z.string()),
  /** What they wrote on step 4. */
  customOutcomes: z.array(z.string()),
  /** What would feel like success, selected on step 4; selecting none is allowed. */
  selectedOutcomes: z.array(z.string()),
  frequency: z.enum(FREQUENCIES).nullable(),
  sessionMinutes: z.number().int().positive().nullable(),
  /** Defaulted so a draft saved before step 6 asked it still parses. */
  readingAmount: z.enum(READING_AMOUNTS).default('balanced'),
  /** Set only when the user overrides the D15 placement on step 7. */
  statusOverride: z.enum(['focus', 'exploring']).nullable(),
})
export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>

export const EMPTY_INTAKE_ANSWERS: IntakeAnswers = {
  wantToLearn: '',
  whyChoice: null,
  whyText: '',
  experienceChoice: null,
  experienceText: '',
  customTopics: [],
  selectedTopics: [],
  customOutcomes: [],
  selectedOutcomes: [],
  frequency: null,
  sessionMinutes: null,
  readingAmount: 'balanced',
  statusOverride: null,
}

/** A finished generation and the inputs it was made from, so a changed answer still re-runs it. */
function keyed<T extends z.ZodType>(value: T) {
  return z.object({ key: z.string(), value }).optional()
}

export const intakeDraftSchema = z.object({
  answers: intakeAnswersSchema,
  /** The step they were last on, 1-based. */
  step: z.number().int().min(1).max(INTAKE_STEP_TOTAL),
  /**
   * Caught on its own: an approach from a build before the brief's newer fields
   * no longer parses, and losing it costs one call where losing the draft
   * would cost every answer.
   */
  approach: keyed(approachOutputSchema).catch(undefined),
  outcomes: keyed(outcomesOutputSchema),
  topics: keyed(topicOptionsOutputSchema),
  path: keyed(pathOutputSchema),
  updatedAt: z.number(),
})
export type IntakeDraft = z.infer<typeof intakeDraftSchema>

export function parseIntakeDraft(value: unknown): IntakeDraft | undefined {
  const parsed = intakeDraftSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** Worth keeping only once they've said what they want to learn. */
export function isDraftWorthKeeping(answers: IntakeAnswers): boolean {
  return answers.wantToLearn.trim().length > 0
}

/**
 * The furthest step the answers allow: each step needs the required answers
 * before it. Topics and outcomes have no required answer, so a complete set
 * reaches step 7.
 */
export function furthestIntakeStep(answers: IntakeAnswers): number {
  if (!isDraftWorthKeeping(answers)) return 1
  if (!answers.whyChoice) return 2
  if (!answers.experienceChoice) return 3
  if (!answers.frequency || !answers.sessionMinutes) return 6
  return 7
}

/** Where picking a draft back up lands: the step they were on, unless an answer it needs is missing. */
export function resumeIntakeStep(draft: Pick<IntakeDraft, 'answers' | 'step'>): number {
  return Math.min(draft.step, furthestIntakeStep(draft.answers))
}
