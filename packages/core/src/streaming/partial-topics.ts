import { choicesOutputSchema } from '../schemas/generations'
import { balancedObjects, findArrayStart } from './balanced'
import type { z } from 'zod'

/**
 * Incremental parsing of G2 `intake.choices` so step 4 fills in as it streams
 * and step 5's outcomes never hold it up: each topic appears as its object
 * closes, and `complete` turns true once the model moves on to "outcomes".
 * A topic that doesn't validate stops extraction there — partial chips never
 * reach the screen.
 */

export type ChoiceTopic = z.infer<typeof choicesOutputSchema>['topics'][number]

export interface PartialTopics {
  topics: ChoiceTopic[]
  /** The topics array is closed: what's here is all of it. */
  complete: boolean
}

const topicSchema = choicesOutputSchema.shape.topics.element

export function extractPartialTopics(text: string): PartialTopics {
  const start = findArrayStart(text, 'topics')
  if (start === -1) return { topics: [], complete: false }

  const topics: ChoiceTopic[] = []
  for (const objectText of balancedObjects(text.slice(start))) {
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
  // The template emits "topics" first, so the next key starting is the array
  // ending — a cheaper and steadier signal than tracking the bracket.
  return { topics, complete: findArrayStart(text, 'outcomes') !== -1 }
}
