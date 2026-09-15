import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryAction } from '@/intake/step-screen'

/** The brief welcome ahead of the six questions (docs/01 §1). Not a step — no progress dot. */
export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-1 justify-end px-5 pb-2">
        <Text className="font-heading-bold text-display text-ink">thinkering</Text>
        <Text className="mt-3 font-sans text-body text-ink-soft">
          Pick something you want to learn. We&apos;ll build a path and a few things to do each day.
        </Text>
        <View className="mt-10">
          <PrimaryAction label="Get started" onPress={() => router.push('/intake/learn')} />
        </View>
      </View>
    </SafeAreaView>
  )
}
