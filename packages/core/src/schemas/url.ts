import { z } from 'zod'

/**
 * Links the model writes, or that reach it from a page, open when the learner
 * taps them. Only plain web pages qualify: `z.string().url()` alone accepts
 * `javascript:`, `data:` and any other scheme a page could talk the model into.
 */
export function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const webUrlSchema = z.string().refine(isWebUrl, { message: 'must be an http or https URL' })
