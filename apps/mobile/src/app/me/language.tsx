import { LANGUAGE_NAMES } from '@thinkering/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { track } from '@/analytics'
import { ChoiceChip } from '@/components/choice-chip'
import { SubScreen } from '@/components/sub-screen'
import { AVAILABLE_LANGUAGES } from '@/i18n'
import { changeLanguage, getLanguagePreference, type LanguagePreference } from '@/i18n/preference'

/**
 * Me → Settings → Language (docs/00 D23). Each language is named in itself, so
 * someone who can't read the current one can still find theirs. New content
 * is generated in the chosen language; what's already made stays as it is.
 */
export default function LanguageScreen() {
  const { t } = useTranslation()
  const [preference, setPreference] = useState<LanguagePreference>(getLanguagePreference)

  const choose = (next: LanguagePreference) => {
    if (next === preference) return
    changeLanguage(next)
    setPreference(next)
    track('settings_changed', { key: 'language' })
  }

  const options: { value: LanguagePreference; label: string }[] = [
    { value: 'device', label: t('me.language.device') },
    ...AVAILABLE_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] })),
  ]

  return (
    <SubScreen title={t('me.language.title')}>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <ChoiceChip
            key={o.value}
            testID={`language-${o.value}`}
            label={o.label}
            selected={preference === o.value}
            onPress={() => choose(o.value)}
          />
        ))}
      </View>
      <Text className="font-sans text-secondary text-ink-soft">{t('me.language.note')}</Text>
    </SubScreen>
  )
}
