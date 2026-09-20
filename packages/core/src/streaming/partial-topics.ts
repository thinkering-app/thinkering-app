import { choicesOutputSchema } from '../schemas/generations'
import { findArrayStart, scanArrayObjects } from './balanced'
import type { z } from 'zod'

/**
 * Incremental parsing of G2 `intake.choices` so step 4 fills in as it streams
 * and step 5's outcomes never hold it up: each topic appears as its object
 * closes. A topic that doesn't validate stops extraction there — partial chips
 * never reach the screen.
 *
 * `complete` is only ever an early release: step 4 also becomes ready when the
 * whole call lands (`topicsState` in the intake context). So it is claimed
 * narrowly — the topics array's own `]` arrived, and the array as a whole is
 * what `choicesOutputSchema` would accept. Anything else falls through to the
 * finished call, which costs a wait rather than a half-filled step.
 */

export type ChoiceTopic = z.infer<typeof choicesOutputSchema>['topics'][number]

export interface PartialTopics {
  topics: ChoiceTopic[]
  /** The topics array is closed: what's here is all of it. */
  complete: boolean
}

const topicsSchema = choicesOutputSchema.shape.topics
const topicSchema = topicsSchema.element

export function extractPartialTopics(text: string): PartialTopics {
  const start = findArrayStart(text, 'topics')
  if (start === -1) return { topics: [], complete: false }

  const { objects, closed } = scanArrayObjects(text.slice(start))
  const topics: ChoiceTopic[] = []
  for (const objectText of objects) {
    let value: unknown
    try {
      value = JSON.parse(objectText)
    } catch {
      break
    }
    const topic = topicSchema.safeParse(value)
    if (!topic.success) break
    topics.push(topic.data)
  }
  // Nothing about the text after the array is evidence: the template asks for
  // "topics" first, but key order is the model's to get wrong, and an
  // "outcomes" seen while topics are still streaming would freeze step 4 on a
  // fraction of its chips.
  //
  // The array schema, not a count of its own: a closed array of three valid
  // topics is still not a list of topics, and releasing it would put chips the
  // finished call is about to reject on the screen — with Continue enabled —
  // while repair is still in flight.
  const complete =
    closed && topics.length === objects.length && topicsSchema.safeParse(topics).success
  return { topics, complete }
}
