import { blockSchema, type Block } from '../schemas/blocks'
import { balancedObjects, findArrayStart } from './balanced'

/**
 * Incremental parsing of a `{ "blocks": [...] }` response — G7's inserted page
 * (docs/04: streamed into the page) and G6's review fill. Each block appears as
 * soon as its object closes; an invalid one stops extraction there.
 */
export function extractPartialBlocks(text: string): Block[] {
  const start = findArrayStart(text, 'blocks')
  if (start === -1) return []
  const blocks: Block[] = []
  for (const objectText of balancedObjects(text.slice(start))) {
    let value: unknown
    try {
      value = JSON.parse(objectText)
    } catch {
      break
    }
    const block = blockSchema.safeParse(value)
    if (!block.success) break
    blocks.push(block.data)
  }
  return blocks
}
