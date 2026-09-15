import type { ResourcesSearchOutput, ResourcesSearchParams } from '@thinkering/core'
import {
  createResource,
  getInterest,
  goalIdsForTitles,
  listGoals,
  listTopics,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { interestContext } from '@/ai/context'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'

/**
 * G4, fired once intake completes (docs/01 §1). Fully background: resources
 * appear when they appear, and a failure is silent — the learner never asked
 * for this, so it must not interrupt them.
 */
export async function seedResources(interestId: string): Promise<void> {
  const interest = getInterest(db, interestId)
  if (!interest) return
  const goals = listGoals(db, interestId)
  if (goals.length === 0) return

  const params: ResourcesSearchParams = {
    context: interestContext(interest, goals),
    goalTitles: goals.map((g) => g.title),
    topics: listTopics(db, interestId)
      .filter((t) => t.selected)
      .map((t) => t.label),
  }
  const { output } = await callAi<ResourcesSearchOutput>('resources.search', params, { interestId })
  for (const resource of output.resources) {
    createResource(db, repoContext, {
      interestId,
      url: resource.url,
      title: resource.title,
      description: resource.description,
      howToUse: resource.howToUse,
      summary: resource.summary,
      source: 'suggested',
      goalIds: goalIdsForTitles(db, interestId, resource.goalTitles),
    })
    track('resource_added', { source: 'suggested' })
  }
}
