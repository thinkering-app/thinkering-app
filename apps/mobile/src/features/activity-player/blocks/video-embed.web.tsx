import { useTranslation } from 'react-i18next'
import { Linking, Pressable, Text, View } from 'react-native'

/**
 * Web export has no WebView; the clip opens in a new tab instead. The mobile
 * app — the product — plays it inline (video-embed.tsx).
 */
export function VideoEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  const { t } = useTranslation()
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(embedUrl)}
      className="items-center justify-center rounded-card bg-ink p-8"
    >
      <View className="gap-1">
        <Text className="font-sans-medium text-body text-white">{title}</Text>
        <Text className="font-sans text-caption text-paper">{t('player.video.openClip')}</Text>
      </View>
    </Pressable>
  )
}
