import type { Href } from 'expo-router'

/**
 * The six intake questions (docs/01 §1), in order. One per screen, progress
 * dots across all six; the welcome screen ahead of them is not a step.
 */
export const INTAKE_STEPS = [
  '/intake/learn',
  '/intake/why',
  '/intake/experience',
  '/intake/time',
  '/intake/topics',
  '/intake/direction',
] as const satisfies readonly Href[]

export const INTAKE_STEP_COUNT = INTAKE_STEPS.length

export function nextStep(current: number): Href {
  return INTAKE_STEPS[current] ?? '/today'
}
