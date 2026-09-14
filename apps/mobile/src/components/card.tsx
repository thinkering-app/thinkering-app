import type { ReactNode } from 'react'
import { View } from 'react-native'

type CardProps = {
  children?: ReactNode
  className?: string
}

/** Surface card with the single soft elevation step (docs/07). */
export function Card({ children, className }: CardProps) {
  return (
    <View className={`rounded-card bg-surface p-5 shadow-card ${className ?? ''}`}>{children}</View>
  )
}
