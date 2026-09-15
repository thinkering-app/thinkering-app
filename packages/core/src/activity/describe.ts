import type { Block } from '../schemas/blocks'
import type { ResponsePayload } from '../schemas/responses'

/**
 * One line describing what the learner did with a block, for G6's review page
 * and G7's page context. Deliberately plain text: the model gets the question
 * and the answer, not our internal ids.
 */
export function describeResponse(block: Block, payload: ResponsePayload): string | undefined {
  // Each case re-checks the block kind: the payload always belongs to the block
  // it was recorded against, but a stale response against an edited document
  // shouldn't render nonsense.
  switch (payload.kind) {
    case 'mcq': {
      if (block.kind !== 'mcq') return undefined
      const chosen = block.options.find((o) => o.id === payload.selectedId)
      const verdict = payload.correct === null ? '' : payload.correct ? ' (correct)' : ' (incorrect)'
      return `Q: ${block.prompt}\nA: ${chosen?.label ?? payload.selectedId}${verdict}`
    }
    case 'freeText':
      return block.kind === 'freeText' ? `Q: ${block.prompt}\nA: ${payload.text}` : undefined
    case 'fillBlank': {
      if (block.kind !== 'fillBlank') return undefined
      const filled = block.blanks
        .map((b) => `${b.answer} → "${payload.answers[b.id] ?? ''}"`)
        .join('; ')
      return `Fill in the blanks (${payload.correct ? 'all correct' : 'some wrong'}): ${filled}`
    }
    case 'ordering': {
      if (block.kind !== 'ordering') return undefined
      const labels = payload.order.map((id) => block.items.find((i) => i.id === id)?.label ?? id)
      return `Q: ${block.prompt}\nOrdered ${payload.correct ? 'correctly' : 'incorrectly'}: ${labels.join(' → ')}`
    }
    case 'matching': {
      if (block.kind !== 'matching') return undefined
      const pairs = Object.entries(payload.pairs).map(([leftId, rightId]) => {
        const left = block.pairs.find((p) => p.leftId === leftId)?.left ?? leftId
        const right = block.pairs.find((p) => p.rightId === rightId)?.right ?? rightId
        return `${left} = ${right}`
      })
      return `Q: ${block.prompt}\nMatched ${payload.correct ? 'correctly' : 'incorrectly'}: ${pairs.join('; ')}`
    }
    case 'reveal':
      return block.kind === 'reveal' ? `Thought about, then revealed: ${block.prompt}` : undefined
    case 'selfRate': {
      if (block.kind !== 'selfRate') return undefined
      const chosen = block.scale.find((s) => s.id === payload.selectedId)
      return `Self-rated "${block.prompt}": ${chosen?.label ?? payload.selectedId}`
    }
  }
}
