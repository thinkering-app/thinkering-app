import { splitApproach, type ApproachOutput, type IntakeApproachParams } from '@thinkering/core'
import { getInterest, updateInterest, type Interest } from '@thinkering/db'

import { callAi } from '@/ai/client'
import { db, repoContext } from '@/db'

/**
 * G1's brief for an interest that has none (docs/04 §Context assembly): one
 * made before the brief was stored, or one whose answers changed in Path
 * settings. Written in the background and stored on its own — the approach
 * notes are the learner's to edit, so the call's notes are dropped. Until it
 * lands, generations go without it, as they did before there was one.
 */

const inFlight = new Set<string>()

/** G1's inputs, from what the interest says now; also the key a finished call is checked against. */
function approachParams(interest: Interest): IntakeApproachParams {
  return {
    wantToLearn: interest.wantToLearn,
    whyChoice: interest.whyChoice,
    whyText: interest.whyText ?? undefined,
    experienceChoice: interest.experienceChoice,
    experienceText: interest.experienceText ?? undefined,
  }
}

/** Whether a Path settings edit changes what the brief was written from. */
export function changesApproachInputs(interest: Interest, patch: Partial<Interest>): boolean {
  const next = approachParams({ ...interest, ...patch })
  return JSON.stringify(next) !== JSON.stringify(approachParams(interest))
}

export function ensureApproachBrief(interestId: string): void {
  const interest = getInterest(db, interestId)
  if (!interest || interest.approachBrief || inFlight.has(interestId)) return
  const params = approachParams(interest)
  const key = JSON.stringify(params)
  inFlight.add(interestId)
  callAi<ApproachOutput>('intake.approach', params, { interestId })
    .then(({ output }) => {
      // Answers edited while the call ran: this brief is for the old ones, and
      // the next generation asks for one again.
      const now = getInterest(db, interestId)
      if (!now || now.approachBrief || JSON.stringify(approachParams(now)) !== key) return
      updateInterest(db, repoContext, interestId, {
        approachBrief: splitApproach(output).approachBrief,
      })
    })
    // Offline or out of quota: the next generation asks again.
    .catch(() => {})
    .finally(() => inFlight.delete(interestId))
}
