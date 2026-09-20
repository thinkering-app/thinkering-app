import { pathOutputSchema } from '../schemas/generations'
import { balancedObjects, findArrayStart, matchStringField } from './balanced'
import type { z } from 'zod'

/**
 * Incremental parsing of G3 `intake.path` so intake step 6 fills in as it
 * streams: the interest name appears first (the template emits it first), then
 * each goal as its object closes. A goal that doesn't validate stops extraction
 * there — partial goals never reach the screen.
 */

export type PathGoal = z.infer<typeof pathOutputSchema>['goals'][number]

export interface PartialPath {
  name?: string
  goals: PathGoal[]
}

const goalSchema = pathOutputSchema.shape.goals.element

export function extractPartialPath(text: string): PartialPath {
  const result: PartialPath = { goals: [] }
  const goalsStart = findArrayStart(text, 'goals')

  result.name = matchStringField(
    text.slice(0, goalsStart === -1 ? text.length : goalsStart),
    'name',
  )
  if (goalsStart === -1) return result

  for (const objectText of balancedObjects(text.slice(goalsStart))) {
    let value: unknown
    try {
      value = JSON.parse(objectText)
    } catch {
      break
    }
    const goal = goalSchema.safeParse(value)
    if (!goal.success) break
    result.goals.push(goal.data)
  }
  return result
}
