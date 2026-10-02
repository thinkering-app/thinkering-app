import Ionicons from '@expo/vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { Generating } from '@/components/generating'
import { colors } from '@/theme/tokens'

export interface WaitCoverProps {
  title: string
  goalTitle?: string
  estMinutes: number
  /** The library item's name and one-line overview — what shape the activity takes. */
  item?: { name: string; overview: string }
  label: string
}

/**
 * What the player shows before G5b's first page (docs/04 §Say where the wait
 * is): the card they tapped, told a little more fully, above the wait. All of it
 * was known before the write started, so none of it is waiting on the model.
 */
export function WaitCover({ title, goalTitle, estMinutes, item, label }: WaitCoverProps) {
  const { t } = useTranslation()
  return (
    <View className="gap-3">
      <Text className="font-heading-bold text-title text-ink">{title}</Text>
      {goalTitle ? (
        <Text className="font-sans text-secondary text-ink-soft">{goalTitle}</Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2 pt-1">
        {item ? (
          <View className="rounded-pill bg-cornflower-tint px-2.5 py-1">
            <Text className="font-sans-medium text-caption text-cornflower-deep">{item.name}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1.5 rounded-pill bg-cornflower-tint px-2.5 py-1">
          <Ionicons name="time-outline" size={13} color={colors.ink.soft} />
          <Text className="font-sans text-caption text-ink">
            {t('today.card.minutesShort', { count: estMinutes })}
          </Text>
        </View>
      </View>
      {item ? <Text className="font-sans text-body text-ink">{item.overview}</Text> : null}
      <Generating label={label} />
    </View>
  )
}
