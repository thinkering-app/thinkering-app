import { FIXTURE_ACTIVITY_DOCS, type LocalDate, type Tier } from '@thinkering/core'
import type { Database, RepoContext } from './database'
import { createActivity, completeActivity } from './repos/activities'
import { createGoal } from './repos/goals'
import { createInterest, listInterests } from './repos/interests'
import { saveResponse } from './repos/responses'
import { SYNCED_TABLE_NAMES, syncedTable } from './backup/rows'
import { analyticsBuffer, genCache, llmCalls, settings } from './schema'

/**
 * Seeds the fixture interest — "Understanding LLMs" with a path, a week of
 * history, and today's cards carrying the hand-written Activity Documents
 * (WP1.3) — so UI work needs no tokens. Idempotent per name: skips if the
 * interest already exists.
 */
export function seedFixtureData(db: Database, ctx: RepoContext, opts: { today: LocalDate }): boolean {
  if (listInterests(db).some((i) => i.name === 'Understanding LLMs')) return false

  const dayMs = 86_400_000
  const daysAgo = (n: number) => ctx.now() - n * dayMs
  const dateDaysAgo = (n: number): LocalDate => {
    const [y, m, d] = opts.today.split('-').map(Number)
    return new Date(Date.UTC(y!, m! - 1, d! - n)).toISOString().slice(0, 10)
  }

  const interest = createInterest(db, ctx, {
    name: 'Understanding LLMs',
    wantToLearn: 'Understand LLMs and AI',
    whyChoice: 'career',
    whyText: 'I want to make better calls about where we use AI at work.',
    experienceChoice: 'explored',
    frequency: 'daily',
    sessionMinutes: 5,
    approachNotes:
      'Quantitative-technical domain: worked examples before open problems, fade scaffolding as experience grows, frequent retrieval of core vocabulary (token, context, temperature).',
    status: 'focus',
    sortOrder: 1,
  })

  const goalDefs: {
    title: string
    description: string
    concepts: { id: string; label: string; kind: 'concept' | 'skill' }[]
  }[] = [
    {
      title: 'Know what a token is',
      description: 'What tokens are, and why they drive cost and context limits.',
      concepts: [
        { id: 'c-tok-what', label: 'Tokenization', kind: 'concept' },
        { id: 'c-tok-estimate', label: 'Estimating token counts', kind: 'skill' },
      ],
    },
    {
      title: 'Context windows and their limits',
      description: 'The model\'s working memory: what fits, what falls out, what it costs.',
      concepts: [
        { id: 'c-ctx-window', label: 'Context window', kind: 'concept' },
        { id: 'c-ctx-budget', label: 'Working within limits', kind: 'skill' },
      ],
    },
    {
      title: 'How models predict text',
      description: 'Next-token prediction, sampling, and what temperature changes.',
      concepts: [
        { id: 'c-pred-nexttoken', label: 'Next-token prediction', kind: 'concept' },
        { id: 'c-pred-temperature', label: 'Temperature and sampling', kind: 'concept' },
      ],
    },
    {
      title: 'Prompting fundamentals',
      description: 'Briefing a model like a stranger: task, constraints, context, examples.',
      concepts: [
        { id: 'c-prompt-clear', label: 'Clear instructions', kind: 'skill' },
        { id: 'c-prompt-fewshot', label: 'Few-shot examples', kind: 'concept' },
      ],
    },
    {
      title: 'Embeddings and similarity',
      description: 'How meaning becomes geometry, and what "similar" means to a model.',
      concepts: [
        { id: 'c-emb-vectors', label: 'Embeddings', kind: 'concept' },
        { id: 'c-emb-search', label: 'Semantic search', kind: 'concept' },
      ],
    },
    {
      title: 'Hallucinations and grounding',
      description: 'Why models make things up and how grounding reins it in.',
      concepts: [
        { id: 'c-hall-why', label: 'Why hallucinations happen', kind: 'concept' },
        { id: 'c-hall-ground', label: 'Grounding with sources', kind: 'skill' },
      ],
    },
  ]
  const goals = goalDefs.map((g, i) =>
    createGoal(db, ctx, { interestId: interest.id, ...g, sortOrder: i + 1, source: 'intake' }),
  )

  // A week of history. Completing via the repos drives the goal statuses to:
  // g1 applied · g2 strengthened · g3 introduced · g4–g6 not started (reflect card shows at ≤3).
  const history: { goal: number; tier: Tier; title: string; item: string; day: number }[] = [
    { goal: 0, tier: 'introduce', title: 'Tokens, not words', item: 'plain-explainer', day: 6 },
    { goal: 0, tier: 'strengthen', title: 'Quick retrieval: tokens', item: 'retrieval-quiz', day: 5 },
    { goal: 1, tier: 'introduce', title: 'The working-memory window', item: 'worked-example', day: 4 },
    { goal: 0, tier: 'apply', title: 'Estimate a real prompt\'s cost', item: 'put-to-work', day: 3 },
    { goal: 1, tier: 'strengthen', title: 'Complete the example: context math', item: 'faded-example', day: 2 },
    { goal: 2, tier: 'introduce', title: 'One token at a time', item: 'guided-discovery', day: 1 },
  ]
  const docForTier = (tier: Tier) => FIXTURE_ACTIVITY_DOCS[tier === 'introduce' ? 'introduce' : tier === 'strengthen' ? 'strengthen' : 'apply']

  let lastHistoryActivityId = ''
  for (const h of history) {
    // Backdate this activity's writes so history spreads over real past days.
    const at = daysAgo(h.day)
    const backdated: RepoContext = { ...ctx, now: () => at }
    const activity = createActivity(db, backdated, {
      interestId: interest.id,
      goalId: goals[h.goal]!.id,
      section: h.tier === 'introduce' ? 'next' : h.tier === 'strengthen' ? 'strengthen' : 'go_further',
      tier: h.tier,
      libraryItemId: h.item,
      title: h.title,
      estMinutes: 5,
      plannedFor: dateDaysAgo(h.day),
      doc: docForTier(h.tier),
    })
    completeActivity(db, backdated, activity.id)
    lastHistoryActivityId = activity.id
  }

  // Today's cards, docs attached, ready to play offline.
  const today = [
    { goal: 3, section: 'next', tier: 'introduce', doc: FIXTURE_ACTIVITY_DOCS.introduce },
    { goal: 2, section: 'strengthen', tier: 'strengthen', doc: FIXTURE_ACTIVITY_DOCS.strengthen },
    { goal: 1, section: 'go_further', tier: 'apply', doc: FIXTURE_ACTIVITY_DOCS.apply },
  ] as const
  for (const t of today) {
    createActivity(db, ctx, {
      interestId: interest.id,
      goalId: goals[t.goal]!.id,
      section: t.section,
      tier: t.tier,
      libraryItemId: t.doc.libraryItemId,
      title: t.doc.title,
      estMinutes: t.doc.estMinutes,
      plannedFor: opts.today,
      doc: t.doc,
    })
  }

  // Responses on yesterday's completed activity, for review-page (G6) development.
  saveResponse(db, ctx, {
    activityId: lastHistoryActivityId,
    pageId: 'intro-hook',
    blockId: 'hook-q',
    payload: { kind: 'mcq', selectedId: 'b', correct: true },
  })
  saveResponse(db, ctx, {
    activityId: lastHistoryActivityId,
    pageId: 'intro-precise',
    blockId: 'precise-reveal',
    payload: { kind: 'reveal', revealed: true },
  })

  return true
}

/**
 * Empties the device's database — a dev-only "start over" (docs/10 Tier 6), not
 * a user action, so it hard-deletes rather than tombstoning. Settings go too,
 * which switches backup off before anything could push: the server copy is
 * left exactly as it was. Children before parents, for the foreign keys.
 */
export function clearAllData(db: Database): void {
  db.transaction((tx) => {
    for (const name of [...SYNCED_TABLE_NAMES].reverse()) {
      tx.delete(syncedTable(name)).run()
    }
    for (const table of [genCache, llmCalls, analyticsBuffer, settings]) {
      tx.delete(table).run()
    }
  })
}
