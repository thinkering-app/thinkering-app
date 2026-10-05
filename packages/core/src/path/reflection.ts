import type { ConceptKind, ReflectionChanges } from '../domain'
import type { ReflectUpdateOutput } from '../schemas/generations'

/**
 * The reflection flow's working draft (docs/01 §5). G8 proposes; the learner
 * decides. Everything here is a pure transformation of the draft so the screen
 * only has to render it — and so "what happens when the model names a goal that
 * isn't there" has one answer, tested once.
 */

export interface DraftGoal {
  /** Stable key for React and for `afterKey` references; not a goal id. */
  key: string
  /** Null for a goal that doesn't exist yet. */
  goalId: string | null
  title: string
  description: string
  concepts: { label: string; kind: ConceptKind }[]
  source: 'reflection' | 'user' | null
  removed: boolean
  /** An undecided proposal from G8 attached to this goal. */
  proposal: DraftProposal | null
}

export type DraftProposal =
  | { kind: 'revise'; title: string; description: string; reason: string }
  | { kind: 'remove'; reason: string }
  | { kind: 'reorder'; afterKey: string | null; reason: string }

export interface SuggestedAddition {
  key: string
  title: string
  description: string
  concepts: { label: string; kind: ConceptKind }[]
  afterKey: string | null
  reason: string
}

export interface ReflectionPlan {
  observations: string
  draft: DraftGoal[]
  /** Suggested goals the learner hasn't added (or dismissed) yet. */
  additions: SuggestedAddition[]
}

export interface ReflectionGoal {
  id: string
  title: string
  description: string
}

/** The refs G8 addresses goals by — assigned in path order, also sent in the prompt params. */
export function goalRefs(
  goals: readonly ReflectionGoal[],
): { ref: string; goal: ReflectionGoal }[] {
  return goals.map((goal, i) => ({ ref: `G${i + 1}`, goal }))
}

/**
 * Turns the path plus G8's response into the draft the flow starts from.
 * Proposals naming a ref that isn't on the path are dropped: a hallucinated
 * reference must never silently land on a different goal.
 */
export function planReflection(
  goals: readonly ReflectionGoal[],
  output: ReflectUpdateOutput,
): ReflectionPlan {
  const byRef = new Map(goalRefs(goals).map(({ ref, goal }) => [ref, goal.id]))
  const before = new Map(goals.map((g, i) => [g.id, i > 0 ? goals[i - 1]!.id : null]))
  const known = new Set(goals.map((g) => g.id))
  const resolve = (ref: string | null): string | null =>
    ref === null ? null : (byRef.get(ref) ?? null)

  const proposals = new Map<string, DraftProposal>()
  for (const change of output.suggestedChanges) {
    const goalId = byRef.get(change.ref)
    // One proposal per goal: a second one for the same goal would give the
    // learner two conflicting decisions on one card.
    if (!goalId || !known.has(goalId) || proposals.has(goalId)) continue
    if (change.type === 'revise') {
      proposals.set(goalId, {
        kind: 'revise',
        title: change.title,
        description: change.description,
        reason: change.reason,
      })
    } else if (change.type === 'remove') {
      proposals.set(goalId, { kind: 'remove', reason: change.reason })
    } else {
      const afterId = resolve(change.afterRef)
      // A reorder that lands a goal after itself, or where it already is,
      // says nothing — and a card proposing it reads as a change that isn't.
      if (afterId === goalId || afterId === before.get(goalId)) continue
      if (change.afterRef !== null && afterId === null) continue
      proposals.set(goalId, { kind: 'reorder', afterKey: afterId, reason: change.reason })
    }
  }

  return {
    observations: output.observations,
    draft: goals.map((goal) => ({
      key: goal.id,
      goalId: goal.id,
      title: goal.title,
      description: goal.description,
      concepts: [],
      source: null,
      removed: false,
      proposal: proposals.get(goal.id) ?? null,
    })),
    additions: output.suggestedGoals.flatMap((suggestion, i) => {
      // An addition whose placement is unresolvable still belongs on the list —
      // it just goes to the end of the path.
      const afterId =
        suggestion.afterRef !== null && !byRef.has(suggestion.afterRef)
          ? (goals.at(-1)?.id ?? null)
          : resolve(suggestion.afterRef)
      return [
        {
          key: `add-${i}`,
          title: suggestion.title,
          description: suggestion.description,
          concepts: suggestion.concepts,
          afterKey: afterId,
          reason: suggestion.reason,
        },
      ]
    }),
  }
}

export function acceptProposal(plan: ReflectionPlan, key: string): ReflectionPlan {
  const entry = plan.draft.find((g) => g.key === key)
  if (!entry?.proposal) return plan
  const proposal = entry.proposal
  const cleared = plan.draft.map((g) => (g.key === key ? { ...g, proposal: null } : g))

  if (proposal.kind === 'revise') {
    return {
      ...plan,
      draft: cleared.map((g) =>
        g.key === key ? { ...g, title: proposal.title, description: proposal.description } : g,
      ),
    }
  }
  if (proposal.kind === 'remove') {
    return { ...plan, draft: cleared.map((g) => (g.key === key ? { ...g, removed: true } : g)) }
  }
  return { ...plan, draft: placeAfter(cleared, key, proposal.afterKey) }
}

export function dismissProposal(plan: ReflectionPlan, key: string): ReflectionPlan {
  return { ...plan, draft: plan.draft.map((g) => (g.key === key ? { ...g, proposal: null } : g)) }
}

export function toggleRemoved(plan: ReflectionPlan, key: string): ReflectionPlan {
  return {
    ...plan,
    draft: plan.draft.map((g) =>
      g.key === key ? { ...g, removed: !g.removed, proposal: null } : g,
    ),
  }
}

/** Moves a goal one place up (-1) or down (+1) among the goals still in the path. */
export function moveDraft(plan: ReflectionPlan, key: string, delta: -1 | 1): ReflectionPlan {
  const index = plan.draft.findIndex((g) => g.key === key)
  const target = index + delta
  if (index === -1 || target < 0 || target >= plan.draft.length) return plan
  const draft = [...plan.draft]
  const [moved] = draft.splice(index, 1)
  draft.splice(target, 0, moved!)
  return { ...plan, draft }
}

/** Adds one of G8's suggestions to the draft, at the place it asked for. */
export function acceptAddition(plan: ReflectionPlan, key: string): ReflectionPlan {
  const addition = plan.additions.find((a) => a.key === key)
  if (!addition) return plan
  const entry: DraftGoal = {
    key: addition.key,
    goalId: null,
    title: addition.title,
    description: addition.description,
    concepts: addition.concepts,
    source: 'reflection',
    removed: false,
    proposal: null,
  }
  return {
    ...plan,
    draft: placeAfter([...plan.draft, entry], entry.key, addition.afterKey),
    additions: plan.additions.filter((a) => a.key !== key),
  }
}

export function dismissAddition(plan: ReflectionPlan, key: string): ReflectionPlan {
  return { ...plan, additions: plan.additions.filter((a) => a.key !== key) }
}

/** A goal the learner wrote themselves, appended to the path. */
export function addOwnGoal(plan: ReflectionPlan, title: string, key: string): ReflectionPlan {
  return {
    ...plan,
    draft: [
      ...plan.draft,
      {
        key,
        goalId: null,
        title,
        description: '',
        concepts: [],
        source: 'user',
        removed: false,
        proposal: null,
      },
    ],
  }
}

function placeAfter(draft: DraftGoal[], key: string, afterKey: string | null): DraftGoal[] {
  const entry = draft.find((g) => g.key === key)
  if (!entry) return draft
  const without = draft.filter((g) => g.key !== key)
  if (afterKey === null) return [entry, ...without]
  const at = without.findIndex((g) => g.key === afterKey)
  if (at === -1) return [...without, entry]
  return [...without.slice(0, at + 1), entry, ...without.slice(at + 1)]
}

/** What the learner accepted, for `reflections.changes` (docs/03). */
export function draftChanges(
  plan: ReflectionPlan,
  original: readonly ReflectionGoal[],
): ReflectionChanges {
  const originalById = new Map(original.map((g) => [g.id, g]))
  const kept = plan.draft.filter((g) => !g.removed)
  return {
    added: kept.filter((g) => g.goalId === null).map((g) => g.title),
    removed: original.filter((g) => !kept.some((k) => k.goalId === g.id)).map((g) => g.title),
    revised: kept
      .filter((g) => g.goalId !== null && originalById.get(g.goalId)?.title !== g.title)
      .map((g) => g.title),
    reordered:
      kept.flatMap((g) => (g.goalId ? [g.goalId] : [])).join(',') !==
      original
        .filter((g) => kept.some((k) => k.goalId === g.id))
        .map((g) => g.id)
        .join(','),
  }
}
