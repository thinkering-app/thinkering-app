import type { Href } from 'expo-router'
import type { IntakeStepName } from '@thinkering/core'

/**
 * The seven intake questions (docs/01 §1), in order. One per screen, progress
 * dots across all seven; the welcome screen ahead of them is not a step. The
 * name is what analytics reports (docs/08), so a funnel survives a reorder.
 */
const INTAKE_STEPS = [
  { href: '/intake/learn', name: 'learn' },
  { href: '/intake/why', name: 'why' },
  { href: '/intake/experience', name: 'experience' },
  { href: '/intake/success', name: 'outcomes' },
  { href: '/intake/topics', name: 'topics' },
  { href: '/intake/time', name: 'time' },
  { href: '/intake/direction', name: 'direction' },
] as const satisfies readonly { href: Href; name: IntakeStepName }[]

export const INTAKE_STEP_COUNT = INTAKE_STEPS.length

/** The screen for a 1-based step. */
export function stepHref(step: number): Href {
  return (INTAKE_STEPS[step - 1] ?? INTAKE_STEPS[0]).href
}

/** The analytics name for a 1-based step. */
export function stepName(step: number): IntakeStepName {
  return (INTAKE_STEPS[step - 1] ?? INTAKE_STEPS[0]).name
}
