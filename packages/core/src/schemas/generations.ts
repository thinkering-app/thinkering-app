import { z } from 'zod'
import { SECTIONS } from '../domain'
import { blockSchema } from './blocks'
import { webUrlSchema } from './url'

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

const topicOptionSchema = z.object({
  label: z.string().min(1).max(60),
  origin: z.enum(['motivation', 'foundational', 'adjacent']),
  blurb: z.string().min(1),
})
const topicOptionsSchema = z.array(topicOptionSchema).min(6).max(14)
const outcomesSchema = z.array(z.string().min(1).max(80)).min(3).max(6)

/**
 * G2 `intake.outcomes` — what step 4 offers: a few first-person outcomes
 * ("I can…", "I understand…") the learner picks from.
 */
export const outcomesOutputSchema = z.object({ outcomes: outcomesSchema })
export type OutcomesOutput = z.infer<typeof outcomesOutputSchema>

/**
 * G2b `intake.topicOptions` — what step 5 offers: ~10 topic chips, worded for
 * the learner's experience (the origin mix is invisible to them).
 */
export const topicOptionsOutputSchema = z.object({ topics: topicOptionsSchema })
export type TopicOptionsOutput = z.infer<typeof topicOptionsOutputSchema>

/**
 * Retired kinds' contracts, kept for one release so builds shipped before
 * them keep working (docs/04 §Retired kinds). Delete with the templates.
 * `intake.topics` and `intake.success` were merged into `intake.choices`,
 * which was split again into `intake.outcomes` and `intake.topicOptions`.
 */
export const topicsOutputSchema = topicOptionsOutputSchema
export const successOutputSchema = outcomesOutputSchema
export const choicesOutputSchema = z.object({
  topics: topicOptionsSchema,
  outcomes: outcomesSchema,
})

/**
 * G8a `reflect.open` — what the reflection flow shows before the learner
 * writes anything: a short recap of their recent learning, and a few more
 * outcomes to consider alongside the ones they already hold.
 */
export const reflectOpenOutputSchema = z.object({
  /** What and how they've been learning lately — 1–2 plain sentences. */
  recap: z.string().min(1).max(400),
  outcomes: z.array(z.string().min(1).max(80)).max(4),
})
export type ReflectOpenOutput = z.infer<typeof reflectOpenOutputSchema>

/**
 * One generated goal, as G3, G8 and G9 all emit it. Concept ids are assigned on
 * save (docs/04), so the model only supplies labels and kinds.
 */
export const generatedGoalSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  concepts: z
    .array(z.object({ label: z.string().min(1).max(60), kind: z.enum(['concept', 'skill']) }))
    .min(1)
    .max(6),
})
export type GeneratedGoal = z.infer<typeof generatedGoalSchema>

/** G3 `intake.path` — interest name + 5–8 sequenced goals with concepts (D16). */
export const pathOutputSchema = z.object({
  name: z.string().min(1).max(40),
  goals: z.array(generatedGoalSchema).min(4).max(9),
})
export type PathOutput = z.infer<typeof pathOutputSchema>

/** G9 `path.suggestGoals` — the three suggestions at the bottom of Path. */
export const suggestedGoalsOutputSchema = z.object({
  goals: z.array(generatedGoalSchema).min(1).max(4),
})
export type SuggestedGoalsOutput = z.infer<typeof suggestedGoalsOutputSchema>

/**
 * G4 `resources.search` — reputable articles and videos found with the web
 * search tool after intake, matched to specific goals by title. Saved as
 * app-suggested resources the learner can delete (docs/01 §5).
 */
export const resourceDraftSchema = z.object({
  url: webUrlSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(400),
  /** How this could be used in their learning — the field the UI shows. */
  howToUse: z.string().min(1).max(400),
  /** Longer, for generation context only; never shown (docs/01 §5). */
  summary: z.string().min(1).max(2000),
  /** Titles of goals it serves; the client maps them back to ids, dropping unknown ones. */
  goalTitles: z.array(z.string()).max(6).default([]),
})
export type ResourceDraft = z.infer<typeof resourceDraftSchema>

export const resourcesSearchOutputSchema = z.object({
  resources: z.array(resourceDraftSchema).max(8),
})
export type ResourcesSearchOutput = z.infer<typeof resourcesSearchOutputSchema>

/**
 * G10 `resource.describe` — a link the learner pasted, drafted from the page
 * text the proxy fetched. The draft is editable before it is saved.
 */
export const resourceDescribeOutputSchema = resourceDraftSchema.omit({ url: true })
export type ResourceDescribeOutput = z.infer<typeof resourceDescribeOutputSchema>

/**
 * G8 `reflect.update` — the reflection flow's proposed path edits (docs/01 §5).
 * Goals are addressed by the short ref the params assign them ("G1", "G2", …)
 * rather than by id: refs are short enough to copy without drift, and the
 * client maps them back, ignoring any it doesn't recognise.
 *
 * Deviating from the docs/04 summary, additions live in `suggestedGoals` only —
 * an `add` change type would have been a second way to say the same thing.
 */
export const reflectionChangeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('revise'),
    ref: z.string().min(1),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    reason: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('remove'),
    ref: z.string().min(1),
    reason: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('reorder'),
    ref: z.string().min(1),
    /** The goal it should follow; null puts it first. */
    afterRef: z.string().min(1).nullable(),
    reason: z.string().min(1).max(200),
  }),
])
export type ReflectionChange = z.infer<typeof reflectionChangeSchema>

export const reflectUpdateOutputSchema = z.object({
  /** What their reflection says about where they are — plain, 2–3 sentences. */
  observations: z.string().min(1).max(600),
  suggestedChanges: z.array(reflectionChangeSchema).max(6),
  suggestedGoals: z
    .array(
      generatedGoalSchema.extend({
        afterRef: z.string().min(1).nullable(),
        reason: z.string().min(1).max(200),
      }),
    )
    .max(4),
})
export type ReflectUpdateOutput = z.infer<typeof reflectUpdateOutputSchema>

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

/**
 * G6 `activity.review` — the blocks that fill the reserved review page. One
 * idea: the highest-value thing to say about their answers (docs/05).
 */
export const reviewOutputSchema = z.object({
  blocks: z.array(blockSchema).min(1).max(6),
})
export type ReviewOutput = z.infer<typeof reviewOutputSchema>

/** G7 `activity.question` — the page inserted after the current one by Ask. */
export const questionOutputSchema = z.object({
  blocks: z.array(blockSchema).min(1).max(6),
})
export type QuestionOutput = z.infer<typeof questionOutputSchema>

/**
 * G11 `routine.customize` — free text from the routine sheet interpreted into
 * library activations plus a preference note saved to `routine_notes`.
 */
export const routineOutputSchema = z.object({
  activations: z
    .array(
      z.object({
        section: z.enum(SECTIONS),
        libraryItemId: z.string().min(1),
        active: z.boolean(),
      }),
    )
    .max(40),
  /** The one-line confirmation, also stored as the routine note. The prompt asks
   * for under 200 characters; the cap has slack so a slightly long line doesn't
   * cost a repair round-trip. */
  note: z.string().min(1).max(400),
})
export type RoutineOutput = z.infer<typeof routineOutputSchema>
