import Constants from 'expo-constants'
import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'

import { toggleInspectorEnabled } from '@/ai/settings'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'
import { FEEDBACK_CONTACT } from '@/feedback/use-feedback'

/**
 * Me → Settings → About (docs/01 §7): who makes thinkering, how to reach us,
 * and the version. The version line is also the hidden toggle (docs/02) that
 * reveals the Developer screen in a production build.
 */

const ASSEMBLY_CODE_URL = 'https://www.assemblycode.org/'

export default function AboutScreen() {
  const [toast, setToast] = useState<string | null>(null)

  return (
    <SubScreen title="About">
      <Text className="font-sans text-body leading-relaxed text-ink-soft">
        thinkering is an early-stage project, actively in development. It&apos;s built by Rebecca
        Hao, with the support of{' '}
        <Text
          className="text-cornflower-deep"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(ASSEMBLY_CODE_URL)}
        >
          Assembly Code
        </Text>
        , a non-profit incubator and studio.
      </Text>

      <View className="gap-2">
        <Text className="font-sans text-body leading-relaxed text-ink-soft">
          We&apos;d love to be in touch about your experience with thinkering, personal learning,
          the science of learning, and AI.
        </Text>
        <Text
          className="font-sans-medium text-body text-cornflower-deep"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${FEEDBACK_CONTACT}`)}
        >
          {FEEDBACK_CONTACT}
        </Text>
      </View>

      {/* Hidden toggle (docs/02): long-press the version to reveal Developer. */}
      <Pressable
        onLongPress={() =>
          setToast(toggleInspectorEnabled() ? 'Developer settings on' : 'Developer settings off')
        }
        delayLongPress={1500}
        className="items-center py-2"
      >
        <Text className="font-sans text-caption text-ink-soft">
          Version {Constants.expoConfig?.version ?? '0.0.0'}
        </Text>
      </Pressable>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}
