import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AnalyticsAskCard } from '@/analytics'
import { importFromFile, refusalMessage } from '@/backup/actions'
import { Wash } from '@/components/texture'
import { PrimaryAction } from '@/intake/step-screen'
import { backupConfigured } from '@/sync/supabase'

/** The brief welcome ahead of the six questions (docs/01 §1). Not a step — no progress dot. */
export default function WelcomeScreen() {
  const [error, setError] = useState<string | null>(null)

  // Coming back has to be reachable on a fresh install, which is the one moment
  // Me isn't (docs/01 §1). With no account to sign in to, it's the file alone.
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
        {/* Clear of the analytics card, which covers the top third until it's answered. */}
        <Wash color="cornflower" size={380} className="-left-28 top-1/4" />
        <Wash color="peach" size={340} className="-right-24 top-[8%]" />
        <Wash color="sun" size={340} className="-bottom-24 -left-16" />
      </View>
      {/* The one-time analytics ask (docs/08) sits up top, clear of Get started. */}
      <View className="px-5 pt-3">
        <AnalyticsAskCard />
      </View>
      <View className="flex-1 justify-end px-5 pb-2">
        <Text className="font-sans-medium text-body text-ink-soft">Welcome to</Text>
        <Text className="mt-1 font-heading-bold text-display text-ink">thinkering</Text>
        <Text className="mt-3 font-sans text-body text-ink-soft">
          Pick something you want to learn. We&apos;ll build a path and a few things to do each day.
        </Text>
        {error ? <Text className="mt-6 font-sans text-secondary text-peach">{error}</Text> : null}
        <View className="mt-10">
          <PrimaryAction
            testID="intake-start"
            label="Get started"
            onPress={() => router.push('/intake/learn')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (backupConfigured ? router.push('/intake/returning') : void restore())}
          className="items-center py-4"
        >
          <Text className="font-sans-medium text-secondary text-ink-soft">
            {backupConfigured
              ? 'I already have an account or a backup file'
              : 'Restore from a backup'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
