import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { isAnalyticsConfigured } from './client'
import { isConsentUndecided } from './consent'
import { setAnalyticsConsent } from './track'

/**
 * The one-time analytics ask (D9, docs/01 §7) — a card at the top of the
 * intake welcome screen, out of the way of Get started. Answering either way
 * removes it for good; declining is a real answer: it deletes the pre-consent
 * buffer and stops the buffering. Renders nothing once decided, or in a build
 * with no PostHog key.
 */
export function AnalyticsAskCard() {
  const [visible, setVisible] = useState(() => isConsentUndecided() && isAnalyticsConfigured())
  if (!visible) return null

  const answer = (granted: boolean) => {
    setAnalyticsConsent(granted)
    setVisible(false)
  }

  return (
    <Card className="gap-2">
      <Text className="font-sans-medium text-body text-ink">Share anonymous usage data?</Text>
      <Text className="font-sans text-secondary text-ink-soft">
        thinkering is new and still changing, so anonymous usage (like what type of activities you
        finish and how long they take) helps us understand how to improve. We never collect what you
        write or what your goals and activities say, and the data is never linked to you.
      </Text>
      <View className="mt-1 flex-row items-center">
        <Button label="Share" onPress={() => answer(true)} />
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
