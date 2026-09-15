import { Alert } from 'react-native'

/** A destructive yes/no, as a promise. Web has its own implementation. */
export function confirmDestructive(options: {
  title: string
  message?: string
  confirmLabel: string
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}
