import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Switch, Text, View } from 'react-native'

import { ReplayMask } from '@/analytics'
import { TextField } from '@/components/text-field'
import { colors } from '@/theme/tokens'
import { describeFeedbackContext } from './context'
import { FEEDBACK_CONTACT, type Feedback } from './use-feedback'

/**
 * The two halves of the feedback chooser (docs/01 §2), as plain views so the
 * sheet behind the global button and the Me → Settings → Feedback screen show
 * the same thing in their own container.
 */

export function FeedbackChooser({
  feedback,
  onEmail,
}: {
  feedback: Feedback
  onEmail: () => void
}) {
  return (
    <>
      {feedback.portal ? (
        <Option
          icon="chatbubbles-outline"
          label="Post to a feedback board"
          caption="Feature requests, discussion, and bugs — post or upvote with an account or anonymously."
          onPress={feedback.openPortal}
        />
      ) : null}
      <Option
        icon="mail-outline"
        label="Send privately by email"
        caption="Goes only to us."
        onPress={onEmail}
      />
      <Text className="pt-2 font-sans text-caption text-ink-soft">
        Questions or privacy concerns: {FEEDBACK_CONTACT}
      </Text>
    </>
  )
}

export function FeedbackEmailFields({ feedback }: { feedback: Feedback }) {
  return (
    <>
      <TextField
        value={feedback.message}
        onChangeText={feedback.setMessage}
        placeholder="What's on your mind?"
        accessibilityLabel="Your feedback"
        multiline
        autoFocus
      />
      <ReplayMask>
        <TextField
          value={feedback.replyEmail}
          onChangeText={feedback.setReplyEmail}
          placeholder="Email, if you'd like a reply (optional)"
          accessibilityLabel="Your email, for a reply"
        />
      </ReplayMask>
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-1">
          <Text className="font-sans text-body text-ink">Include app details</Text>
          <Text className="font-sans text-caption text-ink-soft">
            {describeFeedbackContext(feedback.context)}
          </Text>
        </View>
        <Switch
          value={feedback.includeContext}
          onValueChange={feedback.setIncludeContext}
          trackColor={{ false: colors.hairline, true: colors.cornflower.DEFAULT }}
          thumbColor={colors.surface}
        />
      </View>
      {feedback.error ? (
        <Text className="font-sans text-secondary text-ink">{feedback.error}</Text>
      ) : null}
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
