import Constants from 'expo-constants'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [toast, setToast] = useState<string | null>(null)

  return (
    <SubScreen title={t('me.settings.about')}>
      <Text className="font-sans text-body leading-relaxed text-ink-soft">
        <Trans
          i18nKey="me.about.intro"
          components={{
            a: (
              <Text
                className="text-cornflower-deep"
                accessibilityRole="link"
                onPress={() => void Linking.openURL(ASSEMBLY_CODE_URL)}
              />
            ),
          }}
        />
      </Text>

      <View className="gap-2">
        <Text className="font-sans text-body leading-relaxed text-ink-soft">
          {t('me.about.invite')}
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
          setToast(
            toggleInspectorEnabled() ? t('me.about.developerOn') : t('me.about.developerOff'),
          )
        }
        delayLongPress={1500}
        className="items-center py-2"
      >
        <Text className="font-sans text-caption text-ink-soft">
          {t('me.about.version', { version: Constants.expoConfig?.version ?? '0.0.0' })}
        </Text>
      </Pressable>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}
