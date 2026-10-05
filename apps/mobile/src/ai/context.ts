import {
  activeLibraryItems,
  getLibraryItem,
  SECTIONS,
  type InterestContextInput,
  type LibrarySituation,
} from '@thinkering/core'
import {
  listContexts,
  listGoals,
  listHistory,
  listLibraryPrefs,
  listResources,
  listRoutineNotes,
  type Goal,
  type Interest,
} from '@thinkering/db'

import { db } from '@/db'

/**
 * The per-interest context block every generation call carries (docs/04
 * §Context assembly), read from the local DB. Assembly and budgeting live in
 * packages/core; this is only the reading.
 */

/**
 * How much history every context block carries. Exported because a cache keyed
 * on what a prompt read has to use the same window — see `reflectScope`.
 */
export const RECENT_HISTORY = 10

export function librarySituation(goals: readonly Goal[]): LibrarySituation {
  return { startedGoalCount: goals.filter((g) => g.status !== 'not_started').length }
}

export function interestContext(interest: Interest, goals?: Goal[]): InterestContextInput {
  const path = goals ?? listGoals(db, interest.id)
  const situation = librarySituation(path)
  const prefs = listLibraryPrefs(db, interest.id)
  const goalTitles = new Map(path.map((g) => [g.id, g.title]))

  return {
    interest: {
      name: interest.name,
      wantToLearn: interest.wantToLearn,
      whyChoice: interest.whyChoice,
      whyText: interest.whyText,
      experienceChoice: interest.experienceChoice,
      experienceText: interest.experienceText,
      successOutcomes: interest.successOutcomes,
      frequency: interest.frequency,
      sessionMinutes: interest.sessionMinutes,
      approachNotes: interest.approachNotes,
      approachBrief: interest.approachBrief,
    },
    goals: path.map((g) => ({
      title: g.title,
      status: g.status,
      concepts: g.concepts.map((c) => ({ label: c.label, kind: c.kind })),
    })),
    recentHistory: listHistory(db, { interestId: interest.id, limit: RECENT_HISTORY }).map((a) => ({
      title: a.title,
      goalTitle: (a.goalId ? goalTitles.get(a.goalId) : undefined) ?? a.topic ?? '',
      tier: a.tier,
      libraryItemId: a.libraryItemId,
      rating: a.rating,
    })),
    activeLibraryItems: SECTIONS.flatMap((section) =>
      activeLibraryItems(section, prefs, situation).map((item) => ({ section, id: item.id })),
    ),
    // Assembly decides what to include: contexts only reach apply-tier
    // generation (docs/04), which is the caller's `includeContexts`.
    contexts: listContexts(db, interest.id).map((c) => ({
      kind: c.kind,
      label: c.label,
      notes: c.notes,
    })),
    resources: listResources(db, interest.id).map((r) => ({
      title: r.title,
      description: r.description,
      howToUse: r.howToUse,
      goalTitles: (r.goalIds ?? []).flatMap((id) => {
        const title = goalTitles.get(id)
        return title ? [title] : []
      }),
    })),
    routineNotes: listRoutineNotes(db, interest.id).map((n) => n.note),
  }
}

/** Human names for the library items behind a set of ids (configure sheets, cards). */
export function libraryItemName(id: string): string {
  return getLibraryItem(id)?.name ?? id
}
