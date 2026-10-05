import { z } from 'zod'
import { cappedText } from '../../limits'
import { approachParamSchema } from './intake-approach'
import { pathOutputSchema } from '../../schemas/generations'
import { SHARED_PREAMBLE } from '../preamble'
import type { PromptTemplate } from '../types'

/**
 * G3 `intake.path` — fired on intake step 5 → 6 and streamed onto step 7 (name
 * first, then goals); the time question on step 6 covers the wait. Session
 * length isn't known yet when it goes out, so goals are scoped to a short session.
 */

export const intakePathParamsSchema = z.object({
  wantToLearn: cappedText('wantToLearn', { min: 1 }),
  whyChoice: z.enum(['career', 'personal_goal', 'fun']),
  whyText: cappedText('note').optional(),
  experienceChoice: z.enum(['getting_started', 'explored', 'in_middle', 'experienced']),
  experienceText: cappedText('note').optional(),
  approach: approachParamSchema,
  selectedTopics: z.array(cappedText('line')),
  unselectedTopics: z.array(cappedText('line')).optional(),
  /** What would feel like success — picked or written on step 4. */
  successOutcomes: z.array(cappedText('line')).optional(),
})
export type IntakePathParams = z.infer<typeof intakePathParamsSchema>

const INSTRUCTIONS = `Task: name the interest and lay out its initial path.

Return JSON: {
  "name": string,        // short display name for the interest, as few words as name it (1–3), sentence case ("Conversational German", "LLMs", "PM"); prefer their own short form or a common abbreviation, never pad with "fundamentals", "basics" or "intro to" — emit this field FIRST so it streams early
  "goals": [{
    "title": string,                 // what they'll be able to do or explain after one session, 8 words at most ("Order and react to food at dinner", "Explain what a token is")
    "description": string,           // what this session covers, one or two plain sentences, 30 words at most, written about the material — not instructions to the learner
    "concepts": [{ "label": string, "kind": "concept"|"skill" }]   // 2–4 chips, 2–5 words each; "skill" = something you do, "concept" = something you understand
  }]
}

5–8 goals, each introducible in one 5–15 minute session. The progression principles and pitfalls you're given are this domain's specifics; apply them inside these decisions, made in this order:
1. Where they start. Their experience sets the first goal: getting_started assumes nothing; explored means they know scattered basics, so the first goal consolidates them and moves on; in_middle and experienced skip foundations they likely have and start at the edge of what they can do. Their own words about their experience outrank the label.
2. Where they're going. When they've said what would feel like success, the last one or two goals get them there, and every outcome they picked is reached by some goal.
3. What carries the weight in between. If several goals depend on one structure (German word order, Python functions, a chord shape), that structure is its own goal, placed before the goals that use it — don't spread it thinly across situational goals. Selected topics get priority; a topic shown but not selected is either something they know or something they don't care about, so include it only when a later goal can't be learned without it.
4. Order. Each goal uses what earlier goals taught or what their experience implies. The first goal is a real win in one session. Concrete before abstract.

A goal is one session's worth, not a topic. "Food vocabulary" is a topic; "Order and react to food at dinner" is a goal. "Personal budgeting" is a topic; "Build a one-month spending snapshot" is a goal. If a title would take three sessions to teach properly, narrow it until one session can.

Concept chips name the specific thing taught ("Verb-second rule", not "Word order basics"; "Index funds vs stock picking", not "Investing concepts"). Use as many as the goal really has, from 2 to 4 — don't pad to a fixed count or repeat the same pattern on every goal.`

export const intakePathTemplate: PromptTemplate<
  IntakePathParams,
  z.infer<typeof pathOutputSchema>
> = {
  kind: 'intake.path',
  // v5: medium effort — high spent ~23s thinking before the first goal
  // streamed (docs/04 §Thinking). v6: the sequencing high effort did in its
  // thinking is spelled out, so medium follows it. v7: the name is as short as
  // it can be — it labels chips and tags across the app.
  version: 7,
  model: 'sonnet',
  maxTokens: 16000,
  effort: 'medium',
  paramsSchema: intakePathParamsSchema,
  outputSchema: pathOutputSchema,
  render: (params) => ({
    system: [
      { text: SHARED_PREAMBLE, cache: true },
      { text: INSTRUCTIONS, cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          `They want to learn: ${params.wantToLearn}`,
          `Why: ${params.whyChoice}${params.whyText ? ` — ${params.whyText}` : ''}`,
          `Experience: ${params.experienceChoice}${params.experienceText ? ` — in their words: ${params.experienceText}` : ''}`,
          `Domain: ${params.approach.domain}`,
          `Approach notes: ${params.approach.approachNotes}`,
          `Progression principles: ${params.approach.progressionPrinciples.join(' · ')}`,
          `Pitfalls to design around: ${params.approach.pitfalls.join(' · ')}`,
          `Topics they selected: ${params.selectedTopics.length > 0 ? params.selectedTopics.join(', ') : '(none selected)'}`,
          ...(params.unselectedTopics && params.unselectedTopics.length > 0
            ? [`Topics shown but not selected: ${params.unselectedTopics.join(', ')}`]
            : []),
          ...(params.successOutcomes && params.successOutcomes.length > 0
            ? [`What would feel like success: ${params.successOutcomes.join(' · ')}`]
            : []),
        ].join('\n'),
      },
    ],
  }),
}
