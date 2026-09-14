import type { Database } from '../src/database'
import * as schema from '../src/schema'

/**
 * One plausible row per table — used by the snapshot dump (scripts/dump-snapshot.ts)
 * so committed `fixtures/db/v<N>.sql` files carry data whose survival the
 * migration-chain test can assert.
 */
export function seedSampleRows(db: Database): void {
  const t = 1_757_900_000_000 // fixed epoch ms so snapshots are deterministic
  const stamps = { createdAt: t, updatedAt: t }

  db.insert(schema.interests)
    .values({
      id: 'i-sample',
      name: 'Understanding LLMs',
      wantToLearn: 'Understand LLMs and AI',
      whyChoice: 'career',
      experienceChoice: 'explored',
      frequency: 'daily',
      sessionMinutes: 10,
      approachNotes: 'Worked examples first; fade scaffolding with experience.',
      status: 'focus',
      sortOrder: 1,
      ...stamps,
    })
    .run()
  db.insert(schema.topics)
    .values({ id: 't-sample', interestId: 'i-sample', label: 'Tokenization', origin: 'foundational', selected: true, sortOrder: 1, ...stamps })
    .run()
  db.insert(schema.goals)
    .values({
      id: 'g-sample',
      interestId: 'i-sample',
      title: 'Explain what a token is',
      description: 'What tokens are and why they matter for cost and context.',
      concepts: [{ id: 'c-tokens', label: 'Tokenization', kind: 'concept' }],
      status: 'introduced',
      sortOrder: 1,
      source: 'intake',
      introducedAt: t,
      ...stamps,
    })
    .run()
  db.insert(schema.activities)
    .values({
      id: 'a-sample',
      interestId: 'i-sample',
      goalId: 'g-sample',
      section: 'next',
      tier: 'introduce',
      libraryItemId: 'plain-explainer',
      title: 'Tokens, not words',
      estMinutes: 5,
      status: 'completed',
      plannedFor: '2026-09-14',
      startedAt: t,
      completedAt: t,
      rating: 'up',
      ...stamps,
    })
    .run()
  db.insert(schema.responses)
    .values({ id: 'r-sample', activityId: 'a-sample', pageId: 'p1', blockId: 'q1', payload: { selectedId: 'b' }, ...stamps })
    .run()
  db.insert(schema.resources)
    .values({
      id: 'res-sample',
      interestId: 'i-sample',
      url: 'https://example.com/tokenizers',
      title: 'How tokenizers work',
      description: 'A visual walkthrough.',
      source: 'suggested',
      goalIds: ['g-sample'],
      ...stamps,
    })
    .run()
  db.insert(schema.contexts)
    .values({ id: 'ctx-sample', interestId: 'i-sample', kind: 'project', label: 'Support-bot prototype', ...stamps })
    .run()
  db.insert(schema.reflections)
    .values({ id: 'ref-sample', interestId: 'i-sample', feelingText: 'Going well; want more hands-on work.', changes: { added: 1 }, ...stamps })
    .run()
  db.insert(schema.libraryPrefs)
    .values({ id: 'lp-sample', interestId: 'i-sample', section: 'next', libraryItemId: 'mini-case', active: false, updatedAt: t })
    .run()
  db.insert(schema.routineNotes)
    .values({ id: 'rn-sample', interestId: null, note: 'Prefer shorter reading passages.', ...stamps })
    .run()
  db.insert(schema.genCache)
    .values({ id: 'gc-sample', kind: 'daily_plan', scopeKey: 'i-sample:2026-09-14', payload: { cards: [] }, createdAt: t, expiresAt: t + 86_400_000 })
    .run()
  db.insert(schema.llmCalls)
    .values({
      id: 'llm-sample',
      kind: 'today.plan',
      model: 'claude-haiku-4-5-20251001',
      interestId: 'i-sample',
      request: { system: 'redacted-sample', messages: [] },
      response: { cards: [] },
      inputTokens: 1200,
      outputTokens: 180,
      latencyMs: 900,
      status: 'ok',
      createdAt: t,
    })
    .run()
  db.insert(schema.analyticsBuffer)
    .values({ id: 'ab-sample', event: 'activity_completed', properties: { section: 'next' }, createdAt: t })
    .run()
  db.insert(schema.settings).values({ key: 'posthog_opt_in', value: false }).run()
}
