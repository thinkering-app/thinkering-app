import { Arvo_400Regular, Arvo_700Bold } from '@expo-google-fonts/arvo'
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit'
import { useFonts } from 'expo-font'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Text, View } from 'react-native'

import '../global.css'
import { useDbMigrations, type DbUnavailableReason } from '../db'
import { forgetWebByokKey } from '@/ai/secure-store'
import { useAppOpened } from '@/analytics'
import { Button } from '@/components/button'
import { PaperGrain } from '@/components/texture'
import { useSyncLifecycle } from '@/sync/schedule'

SplashScreen.preventAutoHideAsync()

const DB_UNAVAILABLE_COPY: Record<DbUnavailableReason, string> = {
  'another-tab': 'thinkering is open in another tab. Close it to carry on here.',
  'no-storage': "This browser won't let thinkering store anything. Private browsing blocks it.",
  unknown: 'Something went wrong preparing your data. Please restart the app.',
}

/**
 * The last stop for anything a screen throws. Without it a single failed render
 * — a query that times out on a browser that won't service the SQLite worker,
 * say — unmounts the tree and leaves a white page with nothing to act on.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-paper px-8">
      <Text className="text-center font-sans text-body text-ink">
        Something went wrong on this screen.
      </Text>
      <Button label="Try again" onPress={() => void retry()} />
    </View>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Arvo_400Regular,
    Arvo_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  })
  const migrations = useDbMigrations()
  const ready = fontsLoaded && (migrations.success || Boolean(migrations.failure))
  // Both wait for the schema: their effects run before the first render that
  // does, and on a fresh install the tables they read don't exist yet.
  useSyncLifecycle(migrations.success)
  useAppOpened(migrations.success)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  useEffect(forgetWebByokKey, [])

  if (!ready) return null

  if (migrations.failure) {
    // The database couldn't be opened, so local data can't be trusted — stop
    // rather than run on a wrong schema. The web-only causes get actionable
    // copy and an explicit retry that replaces expo-sqlite's failed worker.
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-paper px-8">
        <Text className="text-center font-sans text-body text-ink">
          {DB_UNAVAILABLE_COPY[migrations.failure]}
        </Text>
        <Button label="Try again" onPress={migrations.retry} />
      </View>
    )
  }

  return (
    <View className="flex-1">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      {/* The paper grain sits over every screen and under every sheet (docs/07). */}
      <PaperGrain />
    </View>
  )
}
