import { useEffect } from 'react'
import { Text, View } from 'react-native'

type ToastProps = {
  message: string | null
  onHide: () => void
  /** How long it stays — brief by design (docs/07). */
  durationMs?: number
}

/** Brief confirmation (docs/07): ink card, no icon, no action. */
export function Toast({ message, onHide, durationMs = 2500 }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onHide, durationMs)
    return () => clearTimeout(timer)
  }, [durationMs, message, onHide])

  if (!message) return null
  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      className="absolute bottom-24 left-5 right-5 items-center"
    >
      <View className="rounded-pill bg-ink px-5 py-3 shadow-card">
        <Text className="font-sans text-secondary text-white">{message}</Text>
      </View>
    </View>
  )
}
