import { Arvo_400Regular, Arvo_700Bold } from '@expo-google-fonts/arvo'
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Text, View } from 'react-native'

import '../global.css'
import { useDbMigrations } from '../db'
import { useAppOpened } from '@/analytics'
import { PaperGrain } from '@/components/texture'
import { useSyncLifecycle } from '@/sync/schedule'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Arvo_400Regular,
    Arvo_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  })
  const migrations = useDbMigrations()
  const ready = fontsLoaded && (migrations.success || Boolean(migrations.error))
  // Both wait for the schema: their effects run before the first render that
  // does, and on a fresh install the tables they read don't exist yet.
  useSyncLifecycle(migrations.success)
  useAppOpened(migrations.success)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  if (migrations.error) {
    // A failed migration means local data can't be trusted — stop rather than run on a wrong schema.
    return (
      <View className="flex-1 items-center justify-center bg-paper px-8">
        <Text className="font-sans text-body text-ink">
          Something went wrong preparing your data. Please restart the app.
        </Text>
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
