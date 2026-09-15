/**
 * Step 1 example chips (docs/01 §1) — tap to fill the field. Four are shown,
 * drawn from the pool per mount so the screen isn't identical every time.
 */
const POOL = [
  'Understand LLMs and AI',
  'Improve my approach to personal finance',
  'Product management skills',
  'More about climate and sustainability',
  'Learn how to draw',
  'Get back into Spanish',
  'Get conversational in German',
  'Improve my chess skills',
] as const

export function sampleExamples(count = 4): string[] {
  const pool = [...POOL]
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
  }
  return picked
}
