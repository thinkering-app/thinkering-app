import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, Linking, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@/components/button'

/**
 * The Featurebase portal in the app's WebView (docs/02 §Feedback): the portal's
 * own navigation between Feature requests, General feedback and Bugs stays
 * inside; anything pointing elsewhere is handed to the system browser. Web has
 * its own implementation — see portal-view.web.tsx.
 */
export function PortalView({ url, host }: { url: string; host: string }) {
  const { t } = useTranslation()
  const webview = useRef<WebView>(null)
  const canGoBack = useRef(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // Android's back gesture walks the portal's own history before leaving.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false
      webview.current?.goBack()
      return true
    })
    return () => subscription.remove()
  }, [])

  if (failed) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center font-sans text-body text-ink-soft">
          {t('me.feedback.boardLoadFailed')}
        </Text>
        <Button
          label={t('common.tryAgain')}
          variant="quiet"
          onPress={() => {
            setFailed(false)
            setLoading(true)
            webview.current?.reload()
          }}
        />
      </View>
    )
  }

  return (
    <View className="flex-1">
      <WebView
        ref={webview}
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) setFailed(true)
        }}
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack
        }}
        onShouldStartLoadWithRequest={(request) => {
          // Featurebase's own pages stay in the WebView; links out don't.
          if (hostOf(request.url) === host || request.url === url) return true
          void Linking.openURL(request.url)
          return false
        }}
        // Featurebase posts as a guest; keeping the session lets a user find
        // their own posts again without us handling any identity.
        sharedCookiesEnabled
        className="flex-1 bg-paper"
      />
      {loading ? (
        <View className="absolute inset-0 items-center justify-center bg-paper">
          <Text className="font-sans text-body text-ink-soft">{t('me.feedback.openingBoard')}</Text>
        </View>
      ) : null}
    </View>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}
