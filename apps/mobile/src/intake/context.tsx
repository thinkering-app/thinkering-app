import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  durationBucket,
  EMPTY_INTAKE_ANSWERS,
  extractPartialPath,
  isDraftWorthKeeping,
  placeInterest,
  type ApproachOutput,
  type ExperienceChoice,
  type IntakeAnswers,
  type InterestStatus,
  type OutcomesOutput,
  type PartialPath,
  type PathOutput,
  type TopicOptionsOutput,
  splitApproach,
} from '@thinkering/core'
import {
  clearIntakeDraft,
  getIntakeDraft,
  listInterests,
  saveIntake,
  saveIntakeDraft,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { useGeneration, type GenerationState } from '@/ai/generation'
import { currentPicks } from './chip-picker'
import { stepName } from './steps'

/**
 * Intake state for one run of the flow (docs/01 §1): the answers so far plus
 * the three generations they trigger. It lives in the intake stack's layout, so
 * it survives back navigation between steps and is discarded on exit.
 *
 * Generation timing (docs/04): G1 goes out when they leave step 2 and has
 * step 3 to finish. G2 (outcomes) and G2b (topics) go out together when they
 * leave step 3, both waiting on G1: step 4 waits only on the short outcomes
 * call, and step 4 is the time the topics have to finish. G3 goes out
 * when they leave step 5 — step 6 is the time question, which covers most of
 * its wait — and streams onto step 7.
 *
 * Until it's saved, the run is also kept as a draft in local settings: the
 * answers, the step they're on and each finished generation. A run that starts
 * while a draft exists picks it up, so a reload, a closed app or a detour
 * through Me loses nothing and costs no second call.
 */

export type Mode = Extract<InterestStatus, 'focus' | 'exploring'>

export type { IntakeAnswers }

interface IntakeValue {
  answers: IntakeAnswers
  update: (patch: Partial<IntakeAnswers>) => void
  approach: GenerationState<ApproachOutput>
  /** Step 4's chips (G2). */
  success: GenerationState<OutcomesOutput>
  /** Step 5's chips (G2b). */
  topics: GenerationState<TopicOptionsOutput>
  path: GenerationState<PathOutput>
  /** G3's output as it streams — the name lands well before the goals do. */
  partialPath: PartialPath
  /** Kick-offs, called as the user leaves the step that unlocks them. */
  /** G1, G2 and G2b. Steps 4 and 5 both call it; the second is a no-op on the same answers. */
  startChoices: () => void
  startPath: () => void
  retryOutcomes: () => void
  retryTopics: () => void
  retryPath: () => void
  /** The D15 placement for the current answers, before any override. */
  placement: Mode
  /** Writes the interest, its topics and its path. Returns the new interest id. */
  save: () => string
  /** Records a finished step (docs/08). Steps 1–6 — step 7 is `intake_completed`. */
  completeStep: (step: number) => void
  /** The step on screen, which is where a draft picks back up. */
  step: number
  visitStep: (step: number) => void
  /** Whether they already have an interest to go back to — a first one has nowhere to leave to. */
  hasInterest: boolean
  /** Drops the draft for good, as they leave without finishing. */
  discard: () => void
}

const IntakeContext = createContext<IntakeValue | null>(null)

export function useIntake(): IntakeValue {
  const value = useContext(IntakeContext)
  if (!value) throw new Error('useIntake must be used inside <IntakeProvider>')
  return value
}

export function IntakeProvider({ children }: { children: ReactNode }) {
  // Read once, on entry: the draft this run picks up, if there is one.
  const [draft] = useState(() => getIntakeDraft(db))
  const [answers, setAnswers] = useState<IntakeAnswers>(draft?.answers ?? EMPTY_INTAKE_ANSWERS)
  const [step, setStep] = useState(draft?.step ?? 1)
  const [hasInterest] = useState(() => listInterests(db).length > 0)
  const [partialPath, setPartialPath] = useState<PartialPath>({ goals: [] })
  const approach = useGeneration<ApproachOutput>(draft?.approach)
  const outcomes = useGeneration<OutcomesOutput>(draft?.outcomes)
  const topics = useGeneration<TopicOptionsOutput>(draft?.topics)
  const path = useGeneration<PathOutput>(draft?.path)

  const update = useCallback((patch: Partial<IntakeAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }))
  }, [])

  // Intake telemetry (docs/08): counts and durations only — none of the answers.
  const stepStartedAt = useRef(0)
  const lastStep = useRef(draft?.step ?? 1)
  const finished = useRef(false)
  const discarded = useRef(false)
  const resumed = draft !== undefined

  useEffect(() => {
    stepStartedAt.current = Date.now()
    track('intake_started', { is_first_interest: !hasInterest, resumed })
    return () => {
      if (!finished.current)
        track('intake_abandoned', {
          last_step: lastStep.current,
          last_screen: stepName(lastStep.current),
        })
    }
  }, [hasInterest, resumed])

  // Keep the draft current. Only finished generations go in: one still in
  // flight is started again by its step when the draft is picked back up.
  const settledApproach = approach.settled
  const settledOutcomes = outcomes.settled
  const settledTopics = topics.settled
  const settledPath = path.settled
  useEffect(() => {
    if (finished.current || discarded.current) return
    if (!isDraftWorthKeeping(answers)) {
      clearIntakeDraft(db)
      return
    }
    saveIntakeDraft(db, {
      answers,
      step,
      approach: settledApproach(),
      outcomes: settledOutcomes(),
      topics: settledTopics(),
      path: settledPath(),
      updatedAt: Date.now(),
    })
  }, [answers, step, settledApproach, settledOutcomes, settledTopics, settledPath])

  const completeStep = useCallback((step: number) => {
    track('intake_step_completed', {
      step,
      screen: stepName(step),
      duration_bucket: durationBucket(Date.now() - stepStartedAt.current),
    })
    stepStartedAt.current = Date.now()
    lastStep.current = step + 1
  }, [])

  /**
   * G1, started on demand and keyed by its inputs: whoever needs the approach
   * calls this and awaits. Going back and changing an answer re-keys it, which
   * supersedes the in-flight call.
   */
  const ensureApproach = useCallback(
    (a: IntakeAnswers, experienceChoice: ExperienceChoice): Promise<ApproachOutput> => {
      const params = choicesParams(a, experienceChoice)
      return approach.start(JSON.stringify(params), (signal) =>
        callAi<ApproachOutput>('intake.approach', params, { signal }).then((r) => r.output),
      )
    },
    [approach],
  )

  /**
   * G1, G2 and G2b, in parallel off the same params; only G3 waits on G1. Each
   * is keyed by them, so a second start on the same answers is a no-op, and a
   * changed answer supersedes all three.
   */
  const startChoices = useCallback(() => {
    if (!answers.experienceChoice) return
    ensureApproach(answers, answers.experienceChoice).catch(() => {})
    const params = choicesParams(answers, answers.experienceChoice)
    const key = JSON.stringify(params)
    outcomes
      .start(key, async (signal) => {
        const result = await callAi<OutcomesOutput>('intake.outcomes', params, { signal })
        return result.output
      })
      .catch(() => {})
    topics
      .start(key, async (signal) => {
        const result = await callAi<TopicOptionsOutput>('intake.topicOptions', params, { signal })
        return result.output
      })
      .catch(() => {})
  }, [answers, outcomes, topics, ensureApproach])

  const startPath = useCallback(() => {
    const { experienceChoice } = answers
    if (!experienceChoice) return
    const offeredTopics =
      topics.state.status === 'ready' ? topics.state.value.topics.map((t) => t.label) : []
    const offeredOutcomes = outcomes.state.status === 'ready' ? outcomes.state.value.outcomes : []
    const params = pathParams(answers, experienceChoice, offeredTopics, offeredOutcomes)
    path
      .start(JSON.stringify(params), async (signal) => {
        setPartialPath({ goals: [] })
        const resolved = await ensureApproach(answers, experienceChoice)
        const result = await callAi<PathOutput>(
          'intake.path',
          { ...params, approach: resolved },
          { signal, onText: (text) => setPartialPath(extractPartialPath(text)) },
        )
        return result.output
      })
      .catch(() => {})
  }, [answers, outcomes.state, topics.state, ensureApproach, path])

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
    const offeredLabels = offered.map((t) => t.label)
    const offeredOutcomes = outcomes.state.status === 'ready' ? outcomes.state.value.outcomes : []
    const selectedTopics = currentPicks(
      { custom: answers.customTopics, selected: answers.selectedTopics },
      offeredLabels,
    )
    const { interest } = saveIntake(db, repoContext, {
      name: path.state.value.name,
      wantToLearn: answers.wantToLearn.trim(),
      whyChoice,
      whyText: optional(answers.whyText) ?? null,
      experienceChoice,
      experienceText: optional(answers.experienceText) ?? null,
      successOutcomes: currentPicks(
        { custom: answers.customOutcomes, selected: answers.selectedOutcomes },
        offeredOutcomes,
      ),
      frequency,
      sessionMinutes,
      readingAmount: answers.readingAmount,
      ...splitApproach(approach.state.value),
      status: answers.statusOverride ?? placement,
      topics: [
        ...answers.customTopics.map((label) => ({
          label,
          origin: 'user' as const,
          selected: selectedTopics.includes(label),
        })),
        ...offered
          .filter((t) => !answers.customTopics.includes(t.label))
          .map((t) => ({
            label: t.label,
            origin: t.origin,
            selected: selectedTopics.includes(t.label),
          })),
      ],
      goals: path.state.value.goals,
    })
    finished.current = true
    clearIntakeDraft(db)
    track('intake_completed', {
      topics_selected_count: selectedTopics.length,
      frequency,
      session_minutes: sessionMinutes,
      reading_amount: answers.readingAmount,
    })
    return interest.id
  }, [answers, approach.state, outcomes.state, topics.state, path.state, placement])

  const discard = useCallback(() => {
    discarded.current = true
    clearIntakeDraft(db)
  }, [])

  const value: IntakeValue = {
    answers,
    update,
    approach: approach.state,
    success: outcomes.state,
    topics: topics.state,
    path: path.state,
    partialPath,
    startChoices,
    startPath,
    retryOutcomes: outcomes.retry,
    retryTopics: topics.retry,
    retryPath: path.retry,
    placement,
    save,
    completeStep,
    step,
    visitStep: setStep,
    hasInterest,
    discard,
  }

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>
}

// ── params, built from the answers known at each trigger point ───────────────

function optional(text: string): string | undefined {
  const trimmed = text.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** G1, G2 and G2b params — the same for all three. */
function choicesParams(a: IntakeAnswers, experienceChoice: ExperienceChoice) {
  return {
    wantToLearn: a.wantToLearn.trim(),
    whyChoice: a.whyChoice,
    whyText: optional(a.whyText),
    experienceChoice,
    experienceText: optional(a.experienceText),
  }
}

/** G3 params. Session length is deliberately absent — they're answering it as this goes out. */
function pathParams(
  a: IntakeAnswers,
  experienceChoice: ExperienceChoice,
  offeredTopics: string[],
  offeredOutcomes: string[],
) {
  const selectedTopics = currentPicks(
    { custom: a.customTopics, selected: a.selectedTopics },
    offeredTopics,
  )
  return {
    ...choicesParams(a, experienceChoice),
    selectedTopics,
    unselectedTopics: offeredTopics.filter((label) => !selectedTopics.includes(label)),
    successOutcomes: currentPicks(
      { custom: a.customOutcomes, selected: a.selectedOutcomes },
      offeredOutcomes,
    ),
  }
}
