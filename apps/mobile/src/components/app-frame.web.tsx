import type { ReactNode } from 'react'
import { useWindowDimensions, View, type ViewStyle } from 'react-native'

/**
 * Widest the app gets in a browser. The app is laid out for a phone; on a
 * desktop window it sits in a phone-width column rather than stretching lines
 * and buttons across the screen (docs/07 §Web). About 70 characters of body
 * text fit on a line.
 */
const COLUMN_WIDTH = 580

/**
 * Centres the app in a column on paper. A window no wider than the column —
 * a phone's browser — gets the app exactly as before, without the edges.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions()
  const framed = width > COLUMN_WIDTH
  return (
    <View className="flex-1 items-center bg-paper">
      <View
        className={`w-full flex-1 overflow-hidden ${framed ? 'border-x border-hairline' : ''}`}
        style={{ maxWidth: COLUMN_WIDTH }}
      >
        {children}
      </View>
    </View>
  )
}

/**
 * Modals render at the page's root, outside the frame, so a sheet or dialog
 * panel takes the column's width itself.
 */
export const columnStyle: ViewStyle = {
  width: '100%',
  maxWidth: COLUMN_WIDTH,
  alignSelf: 'center',
}
