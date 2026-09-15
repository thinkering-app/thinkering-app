import type {
  ConceptKind,
  ExperienceChoice,
  Frequency,
  GoalConcept,
  InterestStatus,
  TopicOrigin,
  WhyChoice,
} from '@thinkering/core'
import type { Database, RepoContext } from '../database'
import { createGoal, type Goal } from './goals'
import { createInterest, listInterests, type Interest } from './interests'
import { createTopic } from './topics'

/**
 * The single write at the end of intake (docs/01 §1): one interest, its topic
 * chips, and the G3 path. Goal concepts arrive from the model as
 * `{label, kind}` and get their stable ids here ("ids assigned on save",
 * docs/04) so activities can reference them (D16).
 */

export interface IntakeTopicInput {
  label: string
  origin: TopicOrigin
  selected: boolean
}

export interface IntakeGoalInput {
  title: string
  description: string
  concepts: { label: string; kind: ConceptKind }[]
}

export interface SaveIntakeInput {
  name: string
  wantToLearn: string
  whyChoice: WhyChoice
  whyText?: string | null
  experienceChoice: ExperienceChoice
  experienceText?: string | null
  frequency: Frequency
  sessionMinutes: number
  approachNotes: string
  status: InterestStatus
  topics: IntakeTopicInput[]
  goals: IntakeGoalInput[]
}

/** Interests sort after every existing one, including archived ones. */
export function nextInterestSortOrder(db: Database): number {
  const orders = listInterests(db).map((i) => i.sortOrder)
  return orders.length === 0 ? 1 : Math.max(...orders) + 1
}

export function saveIntake(
  db: Database,
  ctx: RepoContext,
  input: SaveIntakeInput,
): { interest: Interest; goals: Goal[] } {
  const interest = createInterest(db, ctx, {
    name: input.name,
    wantToLearn: input.wantToLearn,
    whyChoice: input.whyChoice,
    whyText: input.whyText ?? null,
    experienceChoice: input.experienceChoice,
    experienceText: input.experienceText ?? null,
    frequency: input.frequency,
    sessionMinutes: input.sessionMinutes,
    approachNotes: input.approachNotes,
    status: input.status,
    sortOrder: nextInterestSortOrder(db),
  })

  input.topics.forEach((topic, index) => {
    createTopic(db, ctx, {
      interestId: interest.id,
      label: topic.label,
      origin: topic.origin,
      selected: topic.selected,
      sortOrder: index + 1,
    })
  })

  const goals = input.goals.map((goal, index) =>
    createGoal(db, ctx, {
      interestId: interest.id,
      title: goal.title,
      description: goal.description,
      concepts: goal.concepts.map<GoalConcept>((c) => ({ id: ctx.newId(), label: c.label, kind: c.kind })),
      sortOrder: index + 1,
      source: 'intake',
    }),
  )

  return { interest, goals }
}
