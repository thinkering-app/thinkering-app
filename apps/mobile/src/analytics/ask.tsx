import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { ProgressDots } from '@/components/progress-dots'
import { isAnalyticsConfigured } from './client'
import { isConsentUndecided } from './consent'
import { isReplayUndecided, REPLAY_EXPLAINER, setReplayConsent } from './replay'
import { setAnalyticsConsent } from './track'

type Step = 'usage' | 'replay'

/**
 * The one-time sharing ask (D9, D22, docs/01 §7) — a card at the top of the
 * intake welcome screen, out of the way of Get started, in two steps: anonymous
 * usage, then session replays. Each answer is final and moves on; declining is
 * a real answer (for usage it deletes the pre-consent buffer). Usage offers
 * Share as the primary button; replays weigh both answers the same, because
 * a recording shows what people write and nobody should be nudged into it.
 * Renders nothing once both are decided, or in a build with no PostHog key.
 */
export function AnalyticsAskCard() {
  const [step, setStep] = useState<Step | null>(() => nextStep())
  if (!step) return null

  const answer = (granted: boolean) => {
    if (step === 'usage') setAnalyticsConsent(granted)
    else setReplayConsent(granted)
    setStep(nextStep())
  }

  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 font-sans-medium text-body text-ink">
          {step === 'usage' ? 'Share anonymous usage data?' : 'Share session replays?'}
        </Text>
        <ProgressDots current={step === 'usage' ? 1 : 2} total={2} />
      </View>
      <Text className="font-sans text-secondary text-ink-soft">
        {step === 'usage'
          ? 'thinkering is new and still changing, so anonymous usage (like what type of activities you finish and how long they take) helps us understand how to improve. We never collect what you write or what your goals and activities say, and the data is never linked to you.'
          : REPLAY_EXPLAINER}
      </Text>
      <Text className="font-sans text-caption text-ink-soft">
        You can change this later in Me → Settings.
      </Text>
      <View className="mt-1 flex-row items-center">
        <Button
          label="Share"
          variant={step === 'usage' ? 'primary' : 'quiet'}
          onPress={() => answer(true)}
        />
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

function nextStep(): Step | null {
  if (!isAnalyticsConfigured()) return null
  if (isConsentUndecided()) return 'usage'
  if (isReplayUndecided()) return 'replay'
  return null
}
