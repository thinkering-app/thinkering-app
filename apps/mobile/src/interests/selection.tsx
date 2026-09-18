import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useFocusEffect } from 'expo-router'
import { listInterests, type Interest } from '@thinkering/db'

import { db } from '@/db'

/**
 * The interest selector's state (docs/01 §2), shared by Today, Path and
 * History so switching tabs keeps the same interest in view. Archived
 * interests never appear here.
 */

export type Selection =
  | { kind: 'interest'; interestId: string }
  /** The Explore row: `interestId` null is "All" (docs/01 §2). */
  | { kind: 'explore'; interestId: string | null }

interface SelectionValue {
  focus: Interest[]
  exploring: Interest[]
  selection: Selection | null
  select: (selection: Selection) => void
  /** The interests the current selection covers — one, or every exploring one for All. */
  selected: Interest[]
  reload: () => void
}

const SelectionContext = createContext<SelectionValue | null>(null)

/**
 * Intake finishes above this provider (it lives in the tabs layout), so it
 * leaves the interest it just created here and the provider selects it on the
 * way back to Today.
 */
let pendingId: string | null = null

export function selectOnArrival(interestId: string) {
  pendingId = interestId
}

export function useInterestSelection(): SelectionValue {
  const value = useContext(SelectionContext)
  if (!value)
    throw new Error('useInterestSelection must be used inside <InterestSelectionProvider>')
  return value
}

export function InterestSelectionProvider({ children }: { children: ReactNode }) {
  const [interests, setInterests] = useState<Interest[]>(() => listInterests(db))
  const [chosen, setChosen] = useState<Selection | null>(null)

  const reload = useCallback(() => {
    const next = listInterests(db)
    setInterests(next)
    const arrived = pendingId ? next.find((i) => i.id === pendingId) : undefined
    pendingId = null
    if (arrived?.status === 'focus') setChosen({ kind: 'interest', interestId: arrived.id })
    else if (arrived?.status === 'exploring') setChosen({ kind: 'explore', interestId: arrived.id })
  }, [])
  // A new interest can appear while a tab is mounted (intake finishes, Me reorders).
  useFocusEffect(reload)

  const focus = useMemo(() => interests.filter((i) => i.status === 'focus'), [interests])
  const exploring = useMemo(() => interests.filter((i) => i.status === 'exploring'), [interests])

  const selection = useMemo<Selection | null>(() => {
    const isLive =
      chosen?.kind === 'interest'
        ? focus.some((i) => i.id === chosen.interestId)
        : chosen?.kind === 'explore'
          ? chosen.interestId === null || exploring.some((i) => i.id === chosen.interestId)
          : false
    if (isLive) return chosen
    if (focus.length > 0) return { kind: 'interest', interestId: focus[0]!.id }
    if (exploring.length > 0) return { kind: 'explore', interestId: null }
    return null
  }, [chosen, exploring, focus])

  const selected = useMemo(() => {
    if (!selection) return []
    if (selection.kind === 'interest') return focus.filter((i) => i.id === selection.interestId)
    if (selection.interestId === null) return exploring
    return exploring.filter((i) => i.id === selection.interestId)
  }, [exploring, focus, selection])

  const value: SelectionValue = { focus, exploring, selection, select: setChosen, selected, reload }
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}
