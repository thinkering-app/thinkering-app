import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

/**
 * What the renderer adds to a page Ask inserted (docs/05): the question above
 * the answer, so the page still reads as a reply when they come back to it.
 * Pages inserted before the question was recorded simply don't get one.
 */
export function AskedHeader({ question }: { question: string }) {
  const { t } = useTranslation()
  return (
    <View className="gap-1 rounded-card bg-cornflower-tint px-4 py-3">
      <Text className="font-sans-medium text-caption text-cornflower-deep">
        {t('player.ask.askedHeading')}
      </Text>
      <Text className="font-sans text-body text-ink">{question}</Text>
    </View>
  )
}
