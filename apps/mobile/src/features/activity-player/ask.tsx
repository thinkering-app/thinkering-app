import { createContext, useContext } from 'react'

/**
 * Ask (G7, docs/05) reaches blocks through context, so a response block can
 * offer it next to the answer without the player threading it through every
 * block. Null when there's nothing to ask into yet — the block hides the link.
 */
const AskContext = createContext<(() => void) | null>(null)

export const AskProvider = AskContext.Provider

export function useAsk(): (() => void) | null {
  return useContext(AskContext)
}
