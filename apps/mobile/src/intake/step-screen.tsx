import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, router, useFocusEffect, useNavigation } from 'expo-router'
import { useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { furthestIntakeStep } from '@thinkering/core'

import { ProgressDots } from '@/components/progress-dots'
import { colors } from '@/theme/tokens'
import { useIntake } from './context'
import { useLeaveIntake } from './leave-sheet'
import { INTAKE_STEP_COUNT, stepHref } from './steps'

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
  continueLabel,
  continueDisabled = false,
}: StepScreenProps) {
  const { t } = useTranslation()
  // Steps 1–6 finish here; step 7 replaces the action and is counted by
  // `intake_completed` instead (docs/08).
  const { answers, completeStep, visitStep, hasInterest } = useIntake()
  const { requestLeave, leaveSheet } = useLeaveIntake()
  const navigation = useNavigation()
  // A step whose earlier answers are missing — a reload with no draft, or a
  // link straight to it — sends them to the first question still unanswered.
  const furthest = furthestIntakeStep(answers)
  const reachable = step <= furthest

  useFocusEffect(
    useCallback(() => {
      if (reachable) visitStep(step)
    }, [reachable, step, visitStep]),
  )

  // Back walks the questions in order even when this run started partway
  // through (picking up a draft), and from the first one leaves intake: to the
  // welcome for a first interest, otherwise back where they started it from,
  // asking first as the close button does. Never a dead end — a run resumed
  // from a draft has no history behind it and still has to go somewhere.
  const hasPreviousInIntake = (navigation.getState()?.index ?? 0) > 0
  const back = hasPreviousInIntake
    ? () => router.back()
    : step > 1
      ? () => router.replace(stepHref(step - 1))
      : hasInterest
        ? requestLeave
        : () => router.replace('/intake/welcome')

  const advance = onContinue
    ? () => {
        completeStep(step)
        onContinue()
      }
    : undefined

  if (!reachable) return <Redirect href={stepHref(furthest)} />

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-row items-center gap-3 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('intake.stepScreen.back')}
            onPress={back}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink.soft} />
          </Pressable>
          <ProgressDots current={step} total={INTAKE_STEP_COUNT} />
          {/* A first interest has nothing to leave to: Today is empty without it. */}
          {hasInterest ? (
            <Pressable
              testID="intake-close"
              accessibilityRole="button"
              accessibilityLabel={t('intake.stepScreen.close')}
              onPress={requestLeave}
              hitSlop={12}
              className="ml-auto"
            >
              <Ionicons name="close" size={22} color={colors.ink.soft} />
            </Pressable>
          ) : null}
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
              label={continueLabel ?? t('common.continue')}
              onPress={advance}
              disabled={continueDisabled}
            />
          )}
        </View>
      </KeyboardAvoidingView>
      {leaveSheet}
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
