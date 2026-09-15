import type { Frequency, InterestStatus, WhyChoice } from '../domain'

/**
 * Mode placement (D15, docs/01 step 6). An interest lands **in focus** when the
 * user signalled commitment through either lever — a regular cadence, or a
 * career/personal-goal reason. **Exploring** is the for-fun-and-when-I-can
 * corner. Step 6 shows the result and lets one tap override it.
 */
export function placeInterest(input: {
  frequency: Frequency
  whyChoice: WhyChoice
}): Extract<InterestStatus, 'focus' | 'exploring'> {
  const regularCadence = input.frequency === 'daily' || input.frequency === 'several_weekly'
  const committedReason = input.whyChoice === 'career' || input.whyChoice === 'personal_goal'
  return regularCadence || committedReason ? 'focus' : 'exploring'
}
