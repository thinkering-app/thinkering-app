import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors } from '@/theme/tokens'

type SheetProps = {
  visible: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  /** Pinned below the scrolling content — the sheet's single action, when it has one. */
  footer?: ReactNode
}

/**
 * Bottom sheet for configure dialogs (docs/07): paper surface, one action,
 * tap-away to close. Every sheet with a field in it needs to sit above the
 * keyboard, so the avoidance lives here rather than in each caller.
 */
export function Sheet({ visible, onClose, title, children, footer }: SheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-ink/30"
      >
        <Pressable className="flex-1" accessibilityLabel="Close" onPress={onClose} />
        <SafeAreaView edges={['bottom']} className="max-h-[85%] rounded-t-card bg-paper">
          <View className="flex-row items-center justify-between px-5 pb-2 pt-5">
            <Text className="font-heading-bold text-title text-ink">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={colors.ink.soft} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerClassName="gap-3 px-5 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? <View className="px-5 pb-2 pt-1">{footer}</View> : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** The short strategy overview behind a library item (docs/01 §3). A dialog, not a sheet — it's a glance. */
export function InfoDialog({
  visible,
  onClose,
  title,
  body,
}: {
  visible: boolean
  onClose: () => void
  title: string
  body: string
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-ink/30 px-8" onPress={onClose}>
        <View className="w-full gap-3 rounded-card bg-surface p-5 shadow-card">
          <Text className="font-heading text-heading text-ink">{title}</Text>
          <Text className="font-sans text-body text-ink-soft">{body}</Text>
        </View>
      </Pressable>
    </Modal>
  )
}
