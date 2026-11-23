import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'

/**
 * The quiet line at the foot of Today and Path (docs/01 §3, §5): what's on the
 * screen was written by a model. Me → Settings → AI says it at length.
 */
export function AiNote() {
  const { t } = useTranslation()
  return (
    <Text className="self-center text-center font-sans text-caption text-ink-soft">
      {t('common.aiNote')}
    </Text>
  )
}
