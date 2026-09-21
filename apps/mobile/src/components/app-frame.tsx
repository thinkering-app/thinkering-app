import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'

/**
 * The app's outer frame. On a phone the app is the whole screen, so this is a
 * pass-through; the web build centres it in a column (`app-frame.web.tsx`).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Keeps a modal's panel inside the app's column. Nothing to do on a phone. */
export const columnStyle: ViewStyle | undefined = undefined
