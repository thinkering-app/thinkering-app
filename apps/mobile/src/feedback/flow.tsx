import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Platform, Pressable, Switch, Text, View } from 'react-native'
import { featurebasePortalUrl } from '@thinkering/core'

import { track } from '@/analytics'
import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { Toast } from '@/components/toast'
import { colors } from '@/theme/tokens'
import { postFeedback } from './client'
import { describeFeedbackContext, useFeedbackContext } from './context'

/**
 * The feedback chooser (docs/01 §2, D21): post publicly on the Featurebase
 * board, or send us a private email. Two deliberate choices — nothing is sent
 * in the background, and the community option hides when no portal is
 * configured for the build.
 */

const PORTAL_URL = process.env.EXPO_PUBLIC_FEATUREBASE_PORTAL_URL
const CONTACT = 'hello@thinkering.app'
const MAX_MESSAGE_CHARS = 4000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function FeedbackFlow({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const context = useFeedbackContext()
  const [emailOpen, setEmailOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const portal = featurebasePortalUrl(PORTAL_URL, context)

  const openPortal = () => {
    if (!portal) return
    track('featurebase_opened', { screen: context.screen })
    onClose()
    // Expo web has no WebView; the portal opens in a new tab (docs/02).
    if (Platform.OS === 'web') void Linking.openURL(portal)
    else router.push(`/feedback/portal?url=${encodeURIComponent(portal)}`)
  }

  return (
    <>
      <Sheet visible={visible && !emailOpen} onClose={onClose} title="Feedback">
        {portal ? (
          <Option
            icon="chatbubbles-outline"
            label="Post to a feedback board"
            caption="Feature requests, discussion and bugs — posts can be public."
            onPress={openPortal}
          />
        ) : null}
        <Option
          icon="mail-outline"
          label="Send privately by email"
          caption="Goes only to us."
          onPress={() => setEmailOpen(true)}
        />
        <Text className="pt-2 font-sans text-caption text-ink-soft">
          Questions or privacy concerns: {CONTACT}
        </Text>
      </Sheet>

      <EmailSheet
        visible={visible && emailOpen}
        // Dismissing the form leaves feedback altogether rather than bouncing
        // back to the chooser the user already answered.
        onClose={() => {
          setEmailOpen(false)
          onClose()
        }}
        contextLine={describeFeedbackContext(context)}
        onSend={async (message, replyEmail, includeContext) => {
          await postFeedback({
            message,
            ...(replyEmail ? { replyEmail } : {}),
            ...(includeContext ? { context } : {}),
          })
          track('email_feedback_sent', { screen: context.screen, included_context: includeContext })
          setEmailOpen(false)
          onClose()
          setConfirmation('Sent — thank you.')
        }}
      />
      <Toast message={confirmation} onHide={() => setConfirmation(null)} />
    </>
  )
}

function Option({
  icon,
  label,
  caption,
  onPress,
}: {
  icon: 'chatbubbles-outline' | 'mail-outline'
  label: string
  caption: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-card border border-hairline bg-surface p-4 active:bg-cornflower-tint"
    >
      <Ionicons name={icon} size={22} color={colors.cornflower.deep} />
      <View className="flex-1 gap-1">
        <Text className="font-sans-medium text-body text-ink">{label}</Text>
        <Text className="font-sans text-secondary text-ink-soft">{caption}</Text>
      </View>
    </Pressable>
  )
}

/**
 * The private form (docs/01 §2): the message is required, the reply address is
 * optional and never persisted, and what "Include app details" would attach is
 * shown rather than described. A failed send keeps the text for a retry.
 */
function EmailSheet({
  visible,
  onClose,
  contextLine,
  onSend,
}: {
  visible: boolean
  onClose: () => void
  contextLine: string
  onSend: (message: string, replyEmail: string | undefined, includeContext: boolean) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = () => {
    const text = message.trim()
    const email = replyEmail.trim()
    if (text.length === 0) return
    if (email.length > 0 && !EMAIL.test(email)) {
      setError("That email address doesn't look right.")
      return
    }
    setError(null)
    setSending(true)
    onSend(text, email.length > 0 ? email : undefined, includeContext)
      .then(() => {
        setMessage('')
        setReplyEmail('')
      })
      .catch(() => setError("That didn't send. Your message is still here — try again."))
      .finally(() => setSending(false))
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Send feedback"
      footer={
        <Button
          label={sending ? 'Sending…' : 'Send'}
          disabled={sending || message.trim().length === 0}
          onPress={send}
        />
      }
    >
      <TextField
        value={message}
        onChangeText={(next) => setMessage(next.slice(0, MAX_MESSAGE_CHARS))}
        placeholder="What's on your mind?"
        accessibilityLabel="Your feedback"
        multiline
        autoFocus
      />
      <TextField
        value={replyEmail}
        onChangeText={setReplyEmail}
        placeholder="Email, if you'd like a reply (optional)"
        accessibilityLabel="Your email, for a reply"
      />
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-1">
          <Text className="font-sans text-body text-ink">Include app details</Text>
          <Text className="font-sans text-caption text-ink-soft">{contextLine}</Text>
        </View>
        <Switch
          value={includeContext}
          onValueChange={setIncludeContext}
          trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
          thumbColor={colors.surface}
        />
      </View>
      {error ? <Text className="font-sans text-secondary text-ink">{error}</Text> : null}
    </Sheet>
  )
}
