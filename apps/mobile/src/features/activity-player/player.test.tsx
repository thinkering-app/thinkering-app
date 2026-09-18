import { fireEvent, render, screen } from '@testing-library/react-native'
import { useState } from 'react'
import { FIXTURE_DOC_INTRODUCE, type ActivityDoc } from '@thinkering/core'

import { ActivityPlayer } from './player'

/**
 * Player behavior that would be expensive to get wrong (docs/10 Tier 4):
 * resuming where they left off, and a document that is still streaming.
 */

const noop = () => {}

type Overrides = Partial<Omit<React.ComponentProps<typeof ActivityPlayer>, 'page' | 'onPageChange'>>

/** The page index is controlled by the route in the app; this stands in for it. */
function Harness({ startPage = 0, ...overrides }: Overrides & { startPage?: number }) {
  const [page, setPage] = useState(startPage)
  return (
    <ActivityPlayer
      doc={FIXTURE_DOC_INTRODUCE}
      sink={{ initial: {}, save: noop }}
      rating={null}
      ratingText=""
      onRate={noop}
      onDone={noop}
      onClose={noop}
      onShare={noop}
      shareState="idle"
      {...overrides}
      page={page}
      onPageChange={setPage}
    />
  )
}

function renderPlayer(overrides: Overrides & { startPage?: number } = {}) {
  return render(<Harness {...overrides} />)
}

describe('activity player', () => {
  it('resumes on the page the activity was left on', async () => {
    await renderPlayer({ startPage: 2 })
    expect(screen.getByText("Show, don't only tell")).toBeTruthy()
    expect(screen.queryByText('A new colleague, day one')).toBeNull()
  })

  it('moves forward and back a page at a time', async () => {
    await renderPlayer()
    expect(screen.getByText('A new colleague, day one')).toBeTruthy()
    await fireEvent.press(screen.getByText('Continue'))
    expect(screen.getByText('The analogy, made precise')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Back'))
    expect(screen.getByText('A new colleague, day one')).toBeTruthy()
  })

  it('renders a partially streamed document and holds the last page until it finishes', async () => {
    const partial: ActivityDoc = {
      ...FIXTURE_DOC_INTRODUCE,
      pages: FIXTURE_DOC_INTRODUCE.pages.slice(0, 1),
    }
    await renderPlayer({ doc: partial, streaming: true })
    expect(screen.getByText('A new colleague, day one')).toBeTruthy()
    expect(screen.getByText('Writing page 2…')).toBeTruthy()
  })

  it('holds the wait inside the player until the first page arrives', async () => {
    await renderPlayer({
      doc: { ...FIXTURE_DOC_INTRODUCE, pages: [] },
      streaming: true,
      waitLabel: 'Planning your activity',
    })
    expect(screen.getByLabelText('Planning your activity')).toBeTruthy()
    expect(screen.getByLabelText('Close')).toBeTruthy()
  })

  it('waits for the review page rather than showing an empty one', async () => {
    const reviewIndex = FIXTURE_DOC_INTRODUCE.pages.findIndex((p) => p.kind === 'review')
    await renderPlayer({ startPage: reviewIndex })
    expect(screen.getByLabelText('One more look at your answers')).toBeTruthy()
  })

  it('offers Done on the summary page, with the rating row appended', async () => {
    let done = false
    await renderPlayer({
      startPage: FIXTURE_DOC_INTRODUCE.pages.length - 1,
      onDone: () => {
        done = true
      },
    })
    expect(screen.getByText('Was this useful?')).toBeTruthy()
    await fireEvent.press(screen.getByText('Done'))
    expect(done).toBe(true)
  })
})
