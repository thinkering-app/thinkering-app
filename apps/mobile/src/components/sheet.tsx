import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
  // Keep the native modal mounted while the exit motion finishes. The panel
  // and scrim have separate values so the dim can fade in place instead of
  // travelling up the screen with the sheet.
  const [mounted, setMounted] = useState(visible)
  const [previousVisible, setPreviousVisible] = useState(visible)
  const [panelHeight, setPanelHeight] = useState(0)
  const [scrimOpacity] = useState(() => new Animated.Value(0))
  const [panelProgress] = useState(() => new Animated.Value(0))

  // Prop changes are mirrored during render so opening does not require an
  // effect-driven extra commit. Closing deliberately leaves `mounted` true;
  // the animation callback releases it below.
  if (visible !== previousVisible) {
    setPreviousVisible(visible)
    if (visible) setMounted(true)
  }

  useEffect(() => {
    if (!mounted) return

    // Wait for the panel's first layout before entering. This keeps it hidden
    // until it can travel exactly its own height rather than a screen estimate.
    if (visible && panelHeight === 0) return

    const scrim = Animated.timing(scrimOpacity, {
      toValue: visible ? 0.3 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    const panel = Animated.timing(panelProgress, {
      toValue: visible ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    const animation = Animated.parallel([scrim, panel])

    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false)
    })

    return () => animation.stop()
  }, [mounted, panelHeight, panelProgress, scrimOpacity, visible])

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.ink.DEFAULT, opacity: scrimOpacity },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
        >
          <Pressable className="flex-1" accessibilityLabel="Close" onPress={onClose} />
          <Animated.View
            className="max-h-[85%]"
            onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
            style={{
              opacity: panelHeight === 0 ? 0 : 1,
              transform: [
                {
                  translateY: panelProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [panelHeight, 0],
                  }),
                },
              ],
            }}
          >
            <SafeAreaView edges={['bottom']} className="shrink rounded-t-card bg-paper">
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
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
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
