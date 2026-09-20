import type {
  ResourcesMoreParams,
  ResourcesSearchOutput,
  ResourcesSearchParams,
} from '@thinkering/core'
import {
  createResource,
  getInterest,
  goalIdsForTitles,
  listGoals,
  listResources,
  listTopics,
} from '@thinkering/db'
import { Platform } from 'react-native'

import { callAi } from '@/ai'
import { interestContext } from '@/ai/context'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { sameResourceKey } from '@/resources/link'

/**
 * Resource searching (docs/04 G4, G12). Both are background: a web search runs
 * for minutes, so nothing waits on one and a failure is silent.
 */

/**
 * Whether finishing intake searches for resources on its own.
 *
 * Native builds do; the web build doesn't. The search is the app's most
 * expensive call per unit of value — minutes of web search against a budget
 * shared by every device — and the web build is where a visitor tries the app
 * once without meaning to keep it. Find more in the resources panel is on both
 * platforms, so nothing is unreachable on the web; it just has to be asked for.
 */
export const AUTO_SEED_RESOURCES: boolean = Platform.OS !== 'web'

/** Saved URLs, so a search doesn't spend itself returning what they have. */
function savedUrls(interestId: string): string[] {
  return listResources(db, interestId).map((r) => r.url)
}

/**
 * Saves what a search found, skipping anything already saved or repeated
 * within the same response. `excludeUrls` only asks the model not to return
 * them, and the output schema is deliberately loose (docs/04 G4), so this is
 * where a duplicate is actually stopped. The saved set is read here rather
 * than reused from the params: a search runs for minutes, and the learner can
 * add links while it does. Returns how many were saved, which is what the
 * panel reports.
 */
function saveFound(interestId: string, output: ResourcesSearchOutput): number {
  const seen = new Set(savedUrls(interestId).map(sameResourceKey))
  let saved = 0
  for (const resource of output.resources) {
    const key = sameResourceKey(resource.url)
    if (seen.has(key)) continue
    seen.add(key)
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
    saved += 1
  }
  return saved
}

/**
 * G4, fired once intake completes on the platforms that auto-seed (docs/01 §1).
 * Fully background: resources appear when they appear, and a failure is silent
 * — the learner never asked for this, so it must not interrupt them.
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
    excludeUrls: savedUrls(interestId),
  }
  const { output } = await callAi<ResourcesSearchOutput>('resources.search', params, { interestId })
  saveFound(interestId, output)
}

/**
 * G12, from Find more in the resources panel. Same background treatment as G4
 * — the learner can leave the screen — but it ranges over the whole path and
 * is told everything they already have, since asking for more is asking for
 * what isn't there. Returns how many were saved.
 */
export async function findMoreResources(interestId: string): Promise<number> {
  const interest = getInterest(db, interestId)
  if (!interest) return 0
  const goals = listGoals(db, interestId)
  if (goals.length === 0) return 0

  const params: ResourcesMoreParams = {
    context: interestContext(interest, goals),
    goalTitles: goals.map((g) => g.title),
    topics: listTopics(db, interestId)
      .filter((t) => t.selected)
      .map((t) => t.label),
    excludeUrls: savedUrls(interestId),
  }
  const { output } = await callAi<ResourcesSearchOutput>('resources.more', params, { interestId })
  return saveFound(interestId, output)
}
