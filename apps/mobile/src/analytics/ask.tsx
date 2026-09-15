import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { isAnalyticsConfigured } from './client'
import { isConsentUndecided } from './consent'
import { setAnalyticsConsent } from './track'

/**
 * The one-time analytics ask (D9, docs/01 §7) — shown once, after the first
 * completed activity, and never again however it is answered. Declining is a
 * real answer: it deletes the pre-consent buffer and stops the buffering.
 */

/**
 * Whether this completion is the moment to ask. In practice that's the first
 * one; `>= 1` rather than `=== 1` so that someone who got their first
 * completion in a build without a PostHog key is still asked later, once there
 * is one. Being undecided is what makes it happen only once.
 */
export function shouldAskForAnalytics(completedCount: number): boolean {
  return completedCount >= 1 && isConsentUndecided() && isAnalyticsConfigured()
}

export function AnalyticsAskSheet({
  visible,
  onAnswered,
}: {
  visible: boolean
  onAnswered: () => void
}) {
  const answer = (granted: boolean) => {
    setAnalyticsConsent(granted)
    onAnswered()
  }

  return (
    <Sheet
      visible={visible}
      onClose={() => answer(false)}
      title="Share anonymous usage?"
      footer={
        <View className="gap-2">
          <Button label="Share" onPress={() => answer(true)} />
          <Button label="No thanks" variant="quiet" onPress={() => answer(false)} />
        </View>
      }
    >
      <Text className="font-sans text-body text-ink-soft">
        Counts, ratings and how long things take — never what you write, learn or look at, and not
        linked to you.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/me/privacy')}
        className="self-start py-1"
      >
        <Text className="font-sans text-caption text-ink-soft underline">Privacy</Text>
      </Pressable>
    </Sheet>
  )
}
