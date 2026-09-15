import { Text, View } from 'react-native'
import { PRIVACY_CONTACT_EMAIL, PRIVACY_INTRO, PRIVACY_SECTIONS } from '@thinkering/core'

import { SubScreen } from '@/components/sub-screen'

/**
 * Me → Privacy (docs/01 §7, docs/08). The copy is the landing page's, shared
 * through packages/core so the two can't drift.
 */
export default function PrivacyScreen() {
  return (
    <SubScreen title="Privacy">
      <Text className="font-sans text-body leading-relaxed text-ink-soft">{PRIVACY_INTRO}</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} className="gap-2">
          <Text className="font-heading-bold text-heading text-ink">{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text
              key={paragraph.slice(0, 24)}
              className="font-sans text-body leading-relaxed text-ink-soft"
            >
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
      <Text className="font-sans text-secondary text-ink-soft">
        Questions or concerns: {PRIVACY_CONTACT_EMAIL}
      </Text>
    </SubScreen>
  )
}
