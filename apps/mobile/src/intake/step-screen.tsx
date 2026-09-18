import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress-dots'
import { colors } from '@/theme/tokens'
import { useIntake } from './context'
import { INTAKE_STEP_COUNT } from './steps'

type StepScreenProps = {
  /** 1-based position in the seven intake questions. */
  step: number
  question: string
  children: ReactNode
  /** Replaces the default primary button — the last step has its own action. */
  footer?: ReactNode
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
}

/**
 * One intake question (docs/01 §1): progress dots, back navigation, the
 * question as the only heading, and a single forward action. No helper text —
 * if a step needs explaining it needs redesigning.
 */
export function StepScreen({
  step,
  question,
  children,
  footer,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
}: StepScreenProps) {
  // Steps 1–6 finish here; step 7 replaces the action and is counted by
  // `intake_completed` instead (docs/08).
  const { completeStep } = useIntake()
  const advance = onContinue
    ? () => {
        completeStep(step)
        onContinue()
      }
    : undefined

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-row items-center gap-3 px-5 pt-2">
          {router.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink.soft} />
            </Pressable>
          ) : (
            <View className="w-[22px]" />
          )}
          <ProgressDots current={step} total={INTAKE_STEP_COUNT} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-8 gap-6"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text className="font-heading-bold text-title text-ink">{question}</Text>
          {children}
        </ScrollView>

        <View className="px-5 pb-2 pt-2">
          {footer ?? (
            <PrimaryAction
              testID="intake-continue"
              label={continueLabel}
              onPress={advance}
              disabled={continueDisabled}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** Full-width variant of the primary button — intake's forward action is the screen's anchor. */
export function PrimaryAction({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string
  onPress?: () => void
  disabled?: boolean
  /** Stable handle for the Maestro flows (docs/10 Tier 6). */
  testID?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-pill bg-cornflower px-6 py-4 active:bg-cornflower-deep ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Text className="font-sans-medium text-body text-white">{label}</Text>
    </Pressable>
  )
}
