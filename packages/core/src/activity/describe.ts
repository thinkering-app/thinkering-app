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
      const verdict =
        payload.correct === null ? '' : payload.correct ? ' (correct)' : ' (incorrect)'
      return `Q: ${block.prompt}\nA: ${chosen?.label ?? payload.selectedId}${verdict}`
    }
    case 'freeText':
      return block.kind === 'freeText' ? `Q: ${block.prompt}\nA: ${payload.text}` : undefined
    case 'fillBlank': {
      if (block.kind !== 'fillBlank') return undefined
      const filled = block.blanks
        .map((b) => `"${payload.answers[b.id] ?? ''}" (expected "${b.answer}")`)
        .join('; ')
      return `Fill in the blanks: ${block.md}\nA (${payload.correct ? 'all correct' : 'some wrong'}): ${filled}`
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

/**
 * A page as plain text, for the prompts that need to know what the learner is
 * looking at (G7's Ask). Interactions become their prompt line; formatting is
 * dropped — the model needs the content, not our markup.
 */
export function pageToPlainText(page: { blocks: Block[] | null }): string {
  const lines: string[] = []
  for (const block of page.blocks ?? []) {
    switch (block.kind) {
      case 'heading':
        lines.push(block.text)
        break
      case 'paragraph':
      case 'callout':
        lines.push(block.md)
        break
      case 'list':
        lines.push(...block.items.map((item) => `- ${item}`))
        break
      case 'steps':
        lines.push(...block.items.map((step) => `- ${step.label}: ${step.md}`))
        break
      case 'resourceEmbed':
        lines.push(
          `[${block.media}] ${block.title}${block.focus ? ` — watch for: ${block.focus}` : ''}`,
        )
        break
      case 'fillBlank':
        lines.push(`[fill in] ${block.md}`)
        break
      case 'reveal':
        lines.push(`[think, then reveal] ${block.prompt} → ${block.md}`)
        break
      default:
        lines.push(`[${block.kind}] ${block.prompt}`)
    }
  }
  return lines.join('\n')
}
