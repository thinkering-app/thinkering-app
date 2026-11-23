import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'

import { LanguageChoices } from '@/components/language-choices'
import { SubScreen } from '@/components/sub-screen'

/**
 * Me → Settings → Language (docs/00 D23). New content is generated in the
 * chosen language; what's already made stays as it is.
 */
export default function LanguageScreen() {
  const { t } = useTranslation()
  return (
    <SubScreen title={t('me.language.title')}>
      <LanguageChoices />
      <Text className="font-sans text-secondary text-ink-soft">{t('me.language.note')}</Text>
    </SubScreen>
  )
}
