import { View } from 'react-native'
import { WebView } from 'react-native-webview'

/**
 * A clipped YouTube segment (docs/05): the embed player, held to the segment
 * G5b chose. Web has its own implementation — see video-embed.web.tsx.
 */
export function VideoEmbed({ embedUrl }: { embedUrl: string; title: string }) {
  return (
    <View className="aspect-video overflow-hidden rounded-card bg-ink">
      <WebView
        source={{ uri: embedUrl }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        scrollEnabled={false}
      />
    </View>
  )
}
