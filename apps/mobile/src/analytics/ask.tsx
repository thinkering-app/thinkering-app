import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { isAnalyticsConfigured } from './client'
import { isReplayUndecided, REPLAY_EXPLAINER, setReplayConsent } from './replay'

/**
 * The one-time session replay ask (D22) — a card at the top of the intake
 * welcome screen, out of the way of Get started. Share and No thanks weigh
 * the same, because a recording shows what people write and nobody should be
 * nudged into it. Either answer is final. Renders nothing once answered, or
 * in a build with no PostHog key.
 */
export function ReplayAskCard() {
  const [open, setOpen] = useState(() => isAnalyticsConfigured() && isReplayUndecided())
  if (!open) return null

  const answer = (granted: boolean) => {
    setReplayConsent(granted)
    setOpen(false)
  }

  return (
    <Card className="gap-2">
      <Text className="font-sans-medium text-body text-ink">Share session replays?</Text>
      <Text className="font-sans text-secondary text-ink-soft">{REPLAY_EXPLAINER}</Text>
      <Text className="font-sans text-caption text-ink-soft">
        You can change this later in Me → Settings.
      </Text>
      <View className="mt-1 flex-row items-center">
        <Button label="Share" variant="quiet" onPress={() => answer(true)} />
        <Button label="No thanks" variant="quiet" onPress={() => answer(false)} />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/me/privacy')}
          className="ml-auto py-1"
        >
          <Text className="font-sans text-caption text-ink-soft underline">Privacy</Text>
        </Pressable>
      </View>
    </Card>
  )
}
