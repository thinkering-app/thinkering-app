import type { Href } from 'expo-router'

/**
 * The seven intake questions (docs/01 §1), in order. One per screen, progress
 * dots across all seven; the welcome screen ahead of them is not a step.
 */
export const INTAKE_STEPS = [
  '/intake/learn',
  '/intake/why',
  '/intake/experience',
  '/intake/topics',
  '/intake/success',
  '/intake/time',
  '/intake/direction',
] as const satisfies readonly Href[]

export const INTAKE_STEP_COUNT = INTAKE_STEPS.length

export function nextStep(current: number): Href {
  return INTAKE_STEPS[current] ?? '/today'
}

/** The screen for a 1-based step. */
export function stepHref(step: number): Href {
  return INTAKE_STEPS[step - 1] ?? INTAKE_STEPS[0]
}
