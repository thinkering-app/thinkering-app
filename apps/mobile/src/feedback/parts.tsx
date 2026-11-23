import Ionicons from '@expo/vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

import { ReplayMask } from '@/analytics'
import { TextField } from '@/components/text-field'
import { Toggle } from '@/components/toggle'
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
  const { t } = useTranslation()
  return (
    <>
      {feedback.portal ? (
        <Option
          icon="chatbubbles-outline"
          label={t('me.feedback.postToBoard')}
          caption={t('me.feedback.postToBoardCaption')}
          onPress={feedback.openPortal}
        />
      ) : null}
      <Option
        icon="mail-outline"
        label={t('me.feedback.sendPrivately')}
        caption={t('me.feedback.sendPrivatelyCaption')}
        onPress={onEmail}
      />
      <Text className="pt-2 font-sans text-caption text-ink-soft">
        {t('me.feedback.contactLine', { email: FEEDBACK_CONTACT })}
      </Text>
    </>
  )
}

export function FeedbackEmailFields({ feedback }: { feedback: Feedback }) {
  const { t } = useTranslation()
  return (
    <>
      <TextField
        value={feedback.message}
        onChangeText={feedback.setMessage}
        placeholder={t('me.feedback.messagePlaceholder')}
        accessibilityLabel={t('me.feedback.messageAccessibilityLabel')}
        multiline
        autoFocus
      />
      <ReplayMask>
        <TextField
          value={feedback.replyEmail}
          onChangeText={feedback.setReplyEmail}
          placeholder={t('me.feedback.emailPlaceholder')}
          accessibilityLabel={t('me.feedback.emailAccessibilityLabel')}
        />
      </ReplayMask>
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-1">
          <Text className="font-sans text-body text-ink">{t('me.feedback.includeAppDetails')}</Text>
          <Text className="font-sans text-caption text-ink-soft">
            {describeFeedbackContext(feedback.context)}
          </Text>
        </View>
        <Toggle value={feedback.includeContext} onValueChange={feedback.setIncludeContext} />
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
