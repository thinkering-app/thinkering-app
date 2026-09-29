import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { isOverLimit, type Page, type ResponsePayload } from '@thinkering/core'

/**
 * Where an interaction goes (docs/05: responses save immediately, no submit
 * buttons). Blocks never touch the database — they call `respond`, and the
 * player supplies the sink that persists it, which is also what lets the block
 * tests run without SQLite.
 */

export interface ResponseSink {
  /** Answers already recorded for this activity, by block id — the resume state. */
  initial: Record<string, ResponsePayload>
  save: (pageId: string, blockId: string, payload: ResponsePayload) => void
}

interface ResponsesValue {
  answers: Record<string, ResponsePayload>
  respond: (pageId: string, blockId: string, payload: ResponsePayload) => void
}

const ResponsesContext = createContext<ResponsesValue | null>(null)

export function ResponsesProvider({ sink, children }: { sink: ResponseSink; children: ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, ResponsePayload>>(sink.initial)

  const respond = useCallback(
    (pageId: string, blockId: string, payload: ResponsePayload) => {
      setAnswers((prev) => ({ ...prev, [blockId]: payload }))
      sink.save(pageId, blockId, payload)
    },
    [sink],
  )

  const value = useMemo(() => ({ answers, respond }), [answers, respond])
  return <ResponsesContext.Provider value={value}>{children}</ResponsesContext.Provider>
}

/** The recorded answer for a block, and the way to record a new one. */
export function useResponse<T extends ResponsePayload>(
  pageId: string,
  blockId: string,
): [T | undefined, (payload: T) => void] {
  const ctx = useContext(ResponsesContext)
  if (!ctx) throw new Error('activity blocks must render inside <ResponsesProvider>')
  const answer = ctx.answers[blockId] as T | undefined
  return [answer, (payload: T) => ctx.respond(pageId, blockId, payload)]
}

/**
 * Whether a written answer on this page is past its limit. Answers save as they
 * type, so there is no submit to hold back; the player holds Continue instead,
 * since moving on is what sends them to the review (G6).
 */
export function usePageTooLong(page: Page | undefined): boolean {
  const ctx = useContext(ResponsesContext)
  if (!ctx || !page?.blocks) return false
  return page.blocks.some((block) => {
    if (block.kind !== 'freeText') return false
    const answer = ctx.answers[block.id]
    return answer?.kind === 'freeText' && isOverLimit(answer.text, 'long')
  })
}
