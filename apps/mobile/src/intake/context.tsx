import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  extractPartialPath,
  placeInterest,
  type ApproachOutput,
  type ExperienceChoice,
  type Frequency,
  type InterestStatus,
  type PartialPath,
  type PathOutput,
  type TopicsOutput,
  type WhyChoice,
} from '@thinkering/core'
import { saveIntake } from '@thinkering/db'

import { callAi } from '@/ai'
import { db, repoContext } from '@/db'
import { useGeneration, type GenerationState } from './generation'

/**
 * Intake state for one run of the flow (docs/01 §1): the answers so far plus
 * the three generations they trigger. It lives in the intake stack's layout, so
 * it survives back navigation between steps and is discarded on exit.
 *
 * Generation timing (docs/04): G1 goes out when they leave step 2 and has
 * step 3 to finish; G2 goes out when they leave step 3, waits on G1, and has
 * step 4 to finish; G3 goes out when they leave step 5 and streams onto step 6.
 */

export type Mode = Extract<InterestStatus, 'focus' | 'exploring'>

export interface IntakeAnswers {
  wantToLearn: string
  whyChoice: WhyChoice | null
  whyText: string
  experienceChoice: ExperienceChoice | null
  experienceText: string
  frequency: Frequency | null
  sessionMinutes: number | null
  /** Topic labels selected on step 5; selecting none is allowed. */
  selectedTopics: string[]
  /** Set only when the user overrides the D15 placement on step 6. */
  statusOverride: Mode | null
}

const EMPTY: IntakeAnswers = {
  wantToLearn: '',
  whyChoice: null,
  whyText: '',
  experienceChoice: null,
  experienceText: '',
  frequency: null,
  sessionMinutes: null,
  selectedTopics: [],
  statusOverride: null,
}

interface IntakeValue {
  answers: IntakeAnswers
  update: (patch: Partial<IntakeAnswers>) => void
  approach: GenerationState<ApproachOutput>
  topics: GenerationState<TopicsOutput>
  path: GenerationState<PathOutput>
  /** G3's output as it streams — the name lands well before the goals do. */
  partialPath: PartialPath
  /** Kick-offs, called as the user leaves the step that unlocks them. */
  startApproach: () => void
  startTopics: () => void
  startPath: () => void
  retryTopics: () => void
  retryPath: () => void
  /** The D15 placement for the current answers, before any override. */
  placement: Mode
  /** Writes the interest, its topics and its path. Returns the new interest id. */
  save: () => string
}

const IntakeContext = createContext<IntakeValue | null>(null)

export function useIntake(): IntakeValue {
  const value = useContext(IntakeContext)
  if (!value) throw new Error('useIntake must be used inside <IntakeProvider>')
  return value
}

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<IntakeAnswers>(EMPTY)
  const [partialPath, setPartialPath] = useState<PartialPath>({ goals: [] })
  const approach = useGeneration<ApproachOutput>()
  const topics = useGeneration<TopicsOutput>()
  const path = useGeneration<PathOutput>()

  const update = useCallback((patch: Partial<IntakeAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }))
  }, [])

  /**
   * G1, started on demand and keyed by its inputs: whoever needs the approach
   * notes calls this and awaits. Going back and changing an answer re-keys it,
   * which supersedes the in-flight call.
   */
  const ensureApproach = useCallback(
    (a: IntakeAnswers): Promise<ApproachOutput> => {
      const params = approachParams(a)
      return approach.start(JSON.stringify(params), (signal) =>
        callAi<ApproachOutput>('intake.approach', params, { signal }).then((r) => r.output),
      )
    },
    [approach],
  )

  const startApproach = useCallback(() => {
    if (!answers.whyChoice) return
    ensureApproach(answers).catch(() => {})
  }, [answers, ensureApproach])

  const startTopics = useCallback(() => {
    if (!answers.experienceChoice) return
    const params = topicsParams(answers, answers.experienceChoice)
    topics
      .start(JSON.stringify(params), async (signal) => {
        const resolved = await ensureApproach(answers)
        const result = await callAi<TopicsOutput>(
          'intake.topics',
          { ...params, approach: resolved },
          { signal },
        )
        return result.output
      })
      .catch(() => {})
  }, [answers, ensureApproach, topics])

  const startPath = useCallback(() => {
    if (!answers.experienceChoice || !answers.sessionMinutes) return
    const offered = topics.state.status === 'ready' ? topics.state.value.topics.map((t) => t.label) : []
    const params = pathParams(answers, answers.experienceChoice, answers.sessionMinutes, offered)
    path
      .start(JSON.stringify(params), async (signal) => {
        setPartialPath({ goals: [] })
        const resolved = await ensureApproach(answers)
        const result = await callAi<PathOutput>(
          'intake.path',
          { ...params, approach: resolved },
          { signal, onText: (text) => setPartialPath(extractPartialPath(text)) },
        )
        return result.output
      })
      .catch(() => {})
  }, [answers, ensureApproach, path, topics.state])

  const placement: Mode =
    answers.frequency && answers.whyChoice
      ? placeInterest({ frequency: answers.frequency, whyChoice: answers.whyChoice })
      : 'focus'

  const save = useCallback(() => {
    const { whyChoice, experienceChoice, frequency, sessionMinutes } = answers
    if (path.state.status !== 'ready' || approach.state.status !== 'ready') {
      throw new Error('intake is not ready to save: the path has not generated')
    }
    if (!whyChoice || !experienceChoice || !frequency || !sessionMinutes) {
      throw new Error('intake is not ready to save: an answer is missing')
    }
    const offered = topics.state.status === 'ready' ? topics.state.value.topics : []
    const { interest } = saveIntake(db, repoContext, {
      name: path.state.value.name,
      wantToLearn: answers.wantToLearn.trim(),
      whyChoice,
      whyText: optional(answers.whyText) ?? null,
      experienceChoice,
      experienceText: optional(answers.experienceText) ?? null,
      frequency,
      sessionMinutes,
      approachNotes: approach.state.value.approachNotes,
      status: answers.statusOverride ?? placement,
      topics: offered.map((t) => ({
        label: t.label,
        origin: t.origin,
        selected: answers.selectedTopics.includes(t.label),
      })),
      goals: path.state.value.goals,
    })
    return interest.id
  }, [answers, approach.state, path.state, placement, topics.state])

  const value: IntakeValue = {
    answers,
    update,
    approach: approach.state,
    topics: topics.state,
    path: path.state,
    partialPath,
    startApproach,
    startTopics,
    startPath,
    retryTopics: topics.retry,
    retryPath: path.retry,
    placement,
    save,
  }

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>
}

// ── params, built from the answers known at each trigger point ───────────────

function optional(text: string): string | undefined {
  const trimmed = text.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** G1 params. Experience is deliberately absent — they're answering it as this goes out. */
function approachParams(a: IntakeAnswers) {
  return {
    wantToLearn: a.wantToLearn.trim(),
    whyChoice: a.whyChoice,
    whyText: optional(a.whyText),
  }
}

function topicsParams(a: IntakeAnswers, experienceChoice: ExperienceChoice) {
  return { ...approachParams(a), experienceChoice, experienceText: optional(a.experienceText) }
}

function pathParams(
  a: IntakeAnswers,
  experienceChoice: ExperienceChoice,
  sessionMinutes: number,
  offeredTopics: string[],
) {
  return {
    ...topicsParams(a, experienceChoice),
    sessionMinutes,
    selectedTopics: a.selectedTopics,
    unselectedTopics: offeredTopics.filter((label) => !a.selectedTopics.includes(label)),
  }
}
