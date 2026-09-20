import { useCallback, useRef, useState } from 'react'

import { AiBudgetError, AiOutputError, isSearchFailure } from './client'

/**
 * One background generation's lifecycle (docs/04 §Failure handling). The AI
 * client already does the transient retry and the schema-repair round-trip;
 * what's left here is the user-visible part — is it pending, did it fail, and
 * can the screen ask for it again.
 */
export type GenerationState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; value: T }
  | { status: 'error'; message: string }

export interface GenerationRunner<T> {
  state: GenerationState<T>
  /**
   * Starts the call, keyed by its inputs: the same key while in flight or ready
   * reuses the result, a new key supersedes (and aborts) the old one, and a
   * failed key runs again. Returns the in-flight promise so dependent calls can
   * await it.
   */
  start: (key: string, run: (signal: AbortSignal) => Promise<T>) => Promise<T>
  /** Runs the current key again — the Retry affordance on an error state. */
  retry: () => void
  /** The finished result and its key, for keeping it past this screen's life. */
  settled: () => Settled<T> | undefined
}

/** A finished generation and the key it was started with. */
export interface Settled<T> {
  key: string
  value: T
}

interface Entry<T> {
  key: string
  run: (signal: AbortSignal) => Promise<T>
  controller: AbortController
  promise: Promise<T>
  failed: boolean
}

/** `restored` is a result kept from earlier, which `start` reuses for the same key. */
export function useGeneration<T>(restored?: Settled<T>): GenerationRunner<T> {
  const [state, setState] = useState<GenerationState<T>>(() =>
    restored ? { status: 'ready', value: restored.value } : { status: 'idle' },
  )
  const [restoredEntry] = useState((): Entry<T> | null => {
    if (!restored) return null
    const promise = Promise.resolve(restored.value)
    return {
      key: restored.key,
      run: () => promise,
      controller: new AbortController(),
      promise,
      failed: false,
    }
  })
  const current = useRef<Entry<T> | null>(restoredEntry)

  const launch = useCallback((key: string, run: (signal: AbortSignal) => Promise<T>) => {
    current.current?.controller.abort()
    const controller = new AbortController()
    const entry: Entry<T> = { key, run, controller, promise: undefined as never, failed: false }
    entry.promise = run(controller.signal)
    current.current = entry
    setState({ status: 'pending' })
    // Attaching handlers here also marks the promise as handled; awaiting
    // callers still need their own catch.
    entry.promise.then(
      (value) => {
        if (current.current === entry) setState({ status: 'ready', value })
      },
      (error: unknown) => {
        entry.failed = true
        // The AI Inspector records failures too, but only once the call got far
        // enough to log; this catches the ones that didn't.
        if (__DEV__) console.error(`[generation] ${key} failed`, error)
        if (current.current === entry && !controller.signal.aborted) {
          setState({ status: 'error', message: describeAiError(error) })
        }
      },
    )
    return entry.promise
  }, [])

  const start = useCallback(
    (key: string, run: (signal: AbortSignal) => Promise<T>) => {
      const entry = current.current
      if (entry && entry.key === key && !entry.failed) return entry.promise
      return launch(key, run)
    },
    [launch],
  )

  const retry = useCallback(() => {
    const entry = current.current
    if (entry) launch(entry.key, entry.run).catch(() => {})
  }, [launch])

  const settled = useCallback((): Settled<T> | undefined => {
    const entry = current.current
    return entry && state.status === 'ready' ? { key: entry.key, value: state.value } : undefined
  }, [state])

  return { state, start, retry, settled }
}

/** Calm, plain failure copy (docs/07 voice) — no error codes in front of the user. */
export function describeAiError(error: unknown): string {
  if (error instanceof AiBudgetError) return "You've used today's included generation."
  // Before the shape check: a searching kind that came back unusable failed at
  // the search, and saying so is both truer and more actionable than blaming
  // the shape of something the learner never sees.
  if (isSearchFailure(error)) return "Couldn't search the web just now."
  if (error instanceof AiOutputError) return "That came back in a shape we couldn't use."
  return "Couldn't generate that just now."
}
