import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PortalView } from '@/feedback/portal-view'
import { colors } from '@/theme/tokens'

/**
 * The community feedback board (docs/01 §2): Featurebase's public portal, with
 * the URL the chooser built — metadata and all — handed straight to it.
 */
export default function FeedbackPortalScreen() {
  const { t } = useTranslation()
  const { url } = useLocalSearchParams<{ url: string }>()

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('me.feedback.close')}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="close" size={22} color={colors.ink.soft} />
        </Pressable>
        <Text className="flex-1 font-heading-bold text-title text-ink">
          {t('me.feedback.boardTitle')}
        </Text>
      </View>
      {url ? (
        <PortalView url={url} host={hostOf(url)} />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-sans text-body text-ink-soft">
            {t('me.feedback.notConfigured')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}
