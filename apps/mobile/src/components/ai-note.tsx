import { Text } from 'react-native'

/**
 * The quiet line at the foot of Today and Path (docs/01 §3, §5): what's on the
 * screen was written by a model. Me → Settings → AI says it at length.
 */
export function AiNote() {
  return (
    <Text className="self-center text-center font-sans text-caption text-ink-soft">
      Written by AI, which can get things wrong.
    </Text>
  )
}
