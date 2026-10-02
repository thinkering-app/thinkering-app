import { router, useNavigation } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      title={t('intake.leave.title')}
      footer={
        <View className="gap-1">
          <Button
            testID="intake-leave-keep"
            label={t('intake.leave.saveForLater')}
            onPress={() => choose(true)}
          />
          <Button
            testID="intake-leave-discard"
            label={t('intake.leave.discard')}
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
