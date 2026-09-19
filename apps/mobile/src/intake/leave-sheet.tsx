import { router, useNavigation } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { isDraftWorthKeeping } from '@thinkering/core'

import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { useIntake } from './context'

/**
 * Leaving intake before it's done (docs/01 §1). With nothing written yet they
 * just go; otherwise a sheet asks whether to keep it for later or discard it.
 * Closing the sheet stays put.
 */
export function useLeaveIntake() {
  const { answers, discard } = useIntake()
  const navigation = useNavigation()
  const [open, setOpen] = useState(false)

  const leave = () => {
    // Out of the intake stack entirely, back to wherever they started it from.
    const parent = navigation.getParent()
    if (parent?.canGoBack()) parent.goBack()
    else router.replace('/')
  }

  const requestLeave = () => {
    if (isDraftWorthKeeping(answers)) setOpen(true)
    else leave()
  }

  const choose = (keep: boolean) => {
    if (!keep) discard()
    setOpen(false)
    leave()
  }

  const leaveSheet = (
    <Sheet
      visible={open}
      onClose={() => setOpen(false)}
      title="Finish this later?"
      footer={
        <View className="gap-1">
          <Button testID="intake-leave-keep" label="Save for later" onPress={() => choose(true)} />
          <Button
            testID="intake-leave-discard"
            label="Discard"
            variant="quiet"
            onPress={() => choose(false)}
          />
        </View>
      }
    >
      <Text className="font-sans text-body text-ink-soft">{answers.wantToLearn.trim()}</Text>
    </Sheet>
  )

  return { requestLeave, leaveSheet }
}
