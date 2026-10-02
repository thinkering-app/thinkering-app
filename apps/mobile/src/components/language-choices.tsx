import { LANGUAGE_NAMES } from '@thinkering/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { track } from '@/analytics'
import { AVAILABLE_LANGUAGES } from '@/i18n'
import { changeLanguage, getLanguagePreference, type LanguagePreference } from '@/i18n/preference'
import { ChoiceChip } from './choice-chip'

/**
 * The language choice (docs/00 D23), in Me → Settings → Language and on the
 * welcome screen. Each language is named in itself, so someone who can't read
 * the current one can still find theirs.
 */
export function LanguageChoices() {
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
  )
}
