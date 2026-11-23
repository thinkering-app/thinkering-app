import { t } from '@/i18n'

/**
 * Step 1 example chips (docs/01 §1) — tap to fill the field. Four are shown,
 * drawn from the pool per mount so the screen isn't identical every time.
 *
 * These are shown as tappable suggestions and, if tapped, become the stored
 * `wantToLearn` text sent to the model — which handles whatever language it
 * arrives in — so translating the suggestions themselves is safe.
 */
const POOL_KEYS = [
  'intake.learn.examples.llms',
  'intake.learn.examples.personalFinance',
  'intake.learn.examples.productManagement',
  'intake.learn.examples.climate',
  'intake.learn.examples.drawing',
  'intake.learn.examples.spanish',
  'intake.learn.examples.german',
  'intake.learn.examples.chess',
] as const

type ExampleKey = (typeof POOL_KEYS)[number]

export function sampleExamples(count = 4): string[] {
  const pool = [...POOL_KEYS]
  const picked: ExampleKey[] = []
  while (picked.length < count && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
  }
  return picked.map((key) => t(key))
}
