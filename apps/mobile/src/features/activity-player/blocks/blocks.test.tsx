import { fireEvent, render, screen } from '@testing-library/react-native'
import { FIXTURE_ACTIVITY_DOCS, type Block, type ResponsePayload } from '@thinkering/core'

import { BlockView } from './index'
import { ResponsesProvider, type ResponseSink } from '../responses'

/**
 * One behavioral test per block kind (docs/10 Tier 4), driven by the same
 * fixture documents development uses: it renders, it takes an interaction, and
 * it records the payload the `responses` row will carry.
 */

type Recorded = { pageId: string; blockId: string; payload: ResponsePayload }

async function renderBlock(kind: Block['kind']) {
  const found = findBlock(kind)
  const recorded: Recorded[] = []
  const sink: ResponseSink = {
    initial: {},
    save: (pageId, blockId, payload) => recorded.push({ pageId, blockId, payload }),
  }
  await render(
    <ResponsesProvider sink={sink}>
      <BlockView pageId={found.pageId} block={found.block} />
    </ResponsesProvider>,
  )
  return { block: found.block, recorded, last: () => recorded[recorded.length - 1] }
}

/** The first block of a kind anywhere in the three fixture documents. */
function findBlock(kind: Block['kind']): { pageId: string; block: Block } {
  for (const doc of Object.values(FIXTURE_ACTIVITY_DOCS)) {
    for (const page of doc.pages) {
      for (const block of page.blocks ?? []) {
        if (block.kind === kind) return { pageId: page.id, block }
      }
    }
  }
  throw new Error(`no ${kind} block in the fixture documents`)
}

describe('content blocks', () => {
  it.each(['heading', 'paragraph', 'list', 'callout'] as const)(
    'renders a %s as text',
    async (kind) => {
      const { block } = await renderBlock(kind)
      const text =
        block.kind === 'heading'
          ? block.text
          : block.kind === 'list'
            ? block.items[0]!
            : (block as { md: string }).md
      // Inline markdown renders as spans, so match a plain-text fragment of it.
      const fragment = text
        .replace(/[*`_]/g, '')
        .split(/[.,;:]/)[0]!
        .trim()
        .slice(0, 24)
      expect(screen.getByText(new RegExp(escapeRegExp(fragment)))).toBeTruthy()
    },
  )

  it('renders each step of a steps block with its label', async () => {
    const { block } = await renderBlock('steps')
    if (block.kind !== 'steps') throw new Error('wrong block')
    for (const step of block.items) expect(screen.getByText(step.label)).toBeTruthy()
  })

  it('renders a video resource embed with its focus prompt and title', async () => {
    const { block } = await renderBlock('resourceEmbed')
    if (block.kind !== 'resourceEmbed') throw new Error('wrong block')
    expect(
      screen.getAllByText(new RegExp(escapeRegExp(block.title.slice(0, 20)))).length,
    ).toBeGreaterThan(0)
  })
})

describe('interactive blocks', () => {
  it('mcq records the chosen option and whether it was right', async () => {
    const { block, last } = await renderBlock('mcq')
    if (block.kind !== 'mcq') throw new Error('wrong block')
    const wrong = block.options.find((o) => o.id !== block.correctId)!
    await fireEvent.press(screen.getByText(new RegExp(escapeRegExp(wrong.label.slice(0, 20)))))
    expect(last()?.payload).toEqual({ kind: 'mcq', selectedId: wrong.id, correct: false })
  })

  it('freeText records what was typed', async () => {
    const { block, last } = await renderBlock('freeText')
    if (block.kind !== 'freeText') throw new Error('wrong block')
    await fireEvent.changeText(
      screen.getByLabelText(block.prompt),
      'Because the model imitates the pattern.',
    )
    expect(last()?.payload).toEqual({
      kind: 'freeText',
      text: 'Because the model imitates the pattern.',
    })
  })

  it('fillBlank records each blank and grades forgivingly', async () => {
    const { block, last } = await renderBlock('fillBlank')
    if (block.kind !== 'fillBlank') throw new Error('wrong block')
    const blank = block.blanks[0]!
    await fireEvent.changeText(screen.getByLabelText('Blank 1'), ` ${blank.answer.toUpperCase()} `)
    expect(last()?.payload).toMatchObject({
      kind: 'fillBlank',
      answers: { [blank.id]: ` ${blank.answer.toUpperCase()} ` },
    })
    expect((last()?.payload as { correct: boolean }).correct).toBe(block.blanks.length === 1)
  })

  it('ordering records the sequence after a move', async () => {
    const { block, last } = await renderBlock('ordering')
    if (block.kind !== 'ordering') throw new Error('wrong block')
    const second = block.items[1]!
    await fireEvent.press(screen.getByLabelText(`Move ${second.label} up`))
    const payload = last()?.payload as { kind: string; order: string[] }
    expect(payload.kind).toBe('ordering')
    expect(payload.order[0]).toBe(second.id)
  })

  it('matching records a pair and grades it', async () => {
    const { block, last } = await renderBlock('matching')
    if (block.kind !== 'matching') throw new Error('wrong block')
    const pair = block.pairs[0]!
    await fireEvent.press(screen.getByLabelText(pair.left))
    await fireEvent.press(screen.getByLabelText(pair.right))
    expect(last()?.payload).toMatchObject({
      kind: 'matching',
      pairs: { [pair.leftId]: pair.rightId },
    })
  })

  it('reveal shows the answer only after the tap, and records it', async () => {
    const { block, last } = await renderBlock('reveal')
    if (block.kind !== 'reveal') throw new Error('wrong block')
    const answerFragment = escapeRegExp(block.md.replace(/[*`_]/g, '').slice(0, 20))
    expect(screen.queryByText(new RegExp(answerFragment))).toBeNull()
    await fireEvent.press(screen.getByText('Show me'))
    expect(last()?.payload).toEqual({ kind: 'reveal', revealed: true })
    expect(screen.getByText(new RegExp(answerFragment))).toBeTruthy()
  })

  it('selfRate records the step chosen', async () => {
    const { block, last } = await renderBlock('selfRate')
    if (block.kind !== 'selfRate') throw new Error('wrong block')
    const step = block.scale[1]!
    await fireEvent.press(screen.getByText(step.label))
    expect(last()?.payload).toEqual({ kind: 'selfRate', selectedId: step.id })
  })
})

describe('forward compatibility', () => {
  it('an unknown block kind renders the placeholder instead of failing the page', async () => {
    const unknown = { kind: 'diagram', id: 'd1', nodes: [] } as unknown as Block
    await render(
      <ResponsesProvider sink={{ initial: {}, save: () => {} }}>
        <BlockView pageId="p1" block={{ kind: 'paragraph', md: 'Before the unknown block.' }} />
        <BlockView pageId="p1" block={unknown} />
      </ResponsesProvider>,
    )
    expect(screen.getByText('Before the unknown block.')).toBeTruthy()
    expect(screen.getByText(/needs a newer version/)).toBeTruthy()
  })
})

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
