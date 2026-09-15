import { z } from 'zod'

/**
 * Output contracts for the generation kinds (docs/04 §Contracts). Every LLM
 * response crosses one of these before it is stored or rendered. G5b's output
 * is the ActivityDoc (schemas/activity-doc.ts).
 */

/** G1 `intake.approach` — stored on the interest, reused as context by G2/G3/G5/G8. */
export const approachOutputSchema = z.object({
  /** Short domain classification, e.g. "quantitative-technical", "language". */
  domain: z.string().min(1),
  /** Effective approaches & pedagogy for this domain given their why + experience. Editable by the user. */
  approachNotes: z.string().min(1),
  pitfalls: z.array(z.string().min(1)).min(1).max(8),
  progressionPrinciples: z.array(z.string().min(1)).min(1).max(8),
})
export type ApproachOutput = z.infer<typeof approachOutputSchema>

/** G2 `intake.topics` — ~10 chips; the origin mix is invisible to the user. */
export const topicsOutputSchema = z.object({
  topics: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        origin: z.enum(['motivation', 'foundational', 'adjacent']),
        blurb: z.string().min(1),
      }),
    )
    .min(6)
    .max(14),
})
export type TopicsOutput = z.infer<typeof topicsOutputSchema>

/** G3 `intake.path` — interest name + 5–8 sequenced goals with concepts (D16). */
export const pathOutputSchema = z.object({
  name: z.string().min(1).max(40),
  goals: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(240),
        concepts: z
          .array(z.object({ label: z.string().min(1).max(60), kind: z.enum(['concept', 'skill']) }))
          .min(1)
          .max(6),
      }),
    )
    .min(4)
    .max(9),
})
export type PathOutput = z.infer<typeof pathOutputSchema>

/**
 * G5a `today.plan` — the scheduler picks the goals; G5a picks a library item
 * from the active set and writes a human title per card. `goalId` null only
 * for the strengthen prerequisite fallback (the card then carries `topic`).
 */
export const dailyPlanCardSchema = z.object({
  goalId: z.string().nullable(),
  topic: z.string().optional(),
  libraryItemId: z.string().min(1),
  title: z.string().min(1).max(80),
  estMinutes: z.number().int().min(2).max(30),
})
export const dailyPlanOutputSchema = z.object({
  next: z.array(dailyPlanCardSchema).max(2),
  strengthen: z.array(dailyPlanCardSchema).max(3),
  goFurther: z.array(dailyPlanCardSchema).max(3),
})
export type DailyPlanOutput = z.infer<typeof dailyPlanOutputSchema>
export type DailyPlanCard = z.infer<typeof dailyPlanCardSchema>
