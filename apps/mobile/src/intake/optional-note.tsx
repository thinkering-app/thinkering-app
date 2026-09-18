import { Text, View } from 'react-native'

import { TextField } from '@/components/text-field'

type OptionalNoteProps = {
  /** A follow-up question, asked in the learner's terms. */
  question: string
  value: string
  onChangeText: (value: string) => void
}

/**
 * The optional free-text follow-up on intake steps 2 and 3 (docs/01): open from
 * the start, marked optional, and growing with what they write.
 */
export function OptionalNote({ question, value, onChangeText }: OptionalNoteProps) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-body text-ink">
        {question} <Text className="text-secondary text-ink-soft">(optional)</Text>
      </Text>
      <TextField
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={question}
        multiline
      />
    </View>
  )
}
