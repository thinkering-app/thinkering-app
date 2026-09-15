import { Stack } from 'expo-router'

import { IntakeProvider } from '@/intake/context'

/** The intake stack. Answers and in-flight generations live here for the whole run. */
export default function IntakeLayout() {
  return (
    <IntakeProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
    </IntakeProvider>
  )
}
