import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { importFromFile, refusalMessage } from '@/backup/actions'
import { Watercolor } from '@/components/texture'
import { PrimaryAction } from '@/intake/step-screen'

/** The brief welcome ahead of the six questions (docs/01 §1). Not a step — no progress dot. */
export default function WelcomeScreen() {
  const [error, setError] = useState<string | null>(null)

  // A restore has to be reachable on a fresh install, which is the one moment
  // Me isn't (docs/02 §Backup & sync — export/import is the safety net).
  const restore = async () => {
    setError(null)
    const outcome = await importFromFile()
    if (outcome.ok) router.replace('/today')
    else if (outcome.reason !== 'cancelled') setError(refusalMessage(outcome.reason))
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      {/* Washes bleed off the edges like the landing hero (docs/07) — a field, not a shape. */}
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
        <View className="absolute -left-32 -top-20 h-80 w-80">
          <Watercolor color="cornflower" size={320} opacity={0.4} />
        </View>
        <View className="absolute -right-28 top-1/4 h-72 w-72">
          <Watercolor color="peach" size={288} opacity={0.3} />
        </View>
        <View className="absolute -bottom-24 -left-16 h-72 w-72">
          <Watercolor color="sun" size={288} opacity={0.35} />
        </View>
      </View>
      <View className="flex-1 justify-center px-5 pb-16">
        <Text className="font-sans-medium text-body text-ink-soft">Welcome to</Text>
        <Text className="mt-1 font-heading-bold text-display text-ink">thinkering</Text>
        <Text className="mt-3 font-sans text-body text-ink-soft">
          Pick something you want to learn. We&apos;ll build a path and a few things to do each day.
        </Text>
        {error ? (
          <Text className="mt-6 font-sans text-secondary text-peach">{error}</Text>
        ) : null}
        <View className="mt-10">
          <PrimaryAction
            testID="intake-start"
            label="Get started"
            onPress={() => router.push('/intake/learn')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void restore()}
          className="items-center py-4"
        >
          <Text className="font-sans-medium text-secondary text-ink-soft">
            Restore from a backup
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
