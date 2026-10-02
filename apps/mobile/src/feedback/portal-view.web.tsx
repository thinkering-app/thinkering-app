import { useTranslation } from 'react-i18next'
import { Linking, Text, View } from 'react-native'

import { Button } from '@/components/button'

/**
 * Web export has no WebView, and the chooser opens the portal in a new tab
 * directly (docs/02 §Feedback). This is the fallback if the route is reached
 * anyway — e.g. a pasted link or a blocked popup.
 */
export function PortalView({ url }: { url: string; host: string }) {
  const { t } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <Text className="text-center font-sans text-body text-ink-soft">
        {t('me.feedback.opensInNewTab')}
      </Text>
      <Button label={t('me.feedback.openBoard')} onPress={() => void Linking.openURL(url)} />
    </View>
  )
}
