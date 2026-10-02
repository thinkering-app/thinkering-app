import { Alert } from 'react-native'

import { t } from '@/i18n'

/** A destructive yes/no, as a promise. Web has its own implementation. */
export function confirmDestructive(options: {
  title: string
  message?: string
  confirmLabel: string
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}
