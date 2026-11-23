import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors } from '@/theme/tokens'

type SubScreenProps = {
  title: string
  children?: ReactNode
  /** Right-hand header slot — a Done affordance, an icon action. */
  action?: ReactNode
}

/** A pushed screen under a tab (Me's settings, Path's settings): back, title, scrolling body. */
export function SubScreen({ title, children, action }: SubScreenProps) {
  const { t } = useTranslation()
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-5 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text className="flex-1 font-heading-bold text-title text-ink">{title}</Text>
        {action}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}
