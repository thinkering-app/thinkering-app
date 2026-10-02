import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/button'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'
import { FeedbackChooser, FeedbackEmailFields } from '@/feedback/parts'
import { useFeedback } from '@/feedback/use-feedback'

/**
 * Me → Settings → Feedback (docs/01 §7): the same two channels as the global
 * button, as a pushed screen rather than a sheet — everything under the ⚙
 * opens the same way.
 */
export default function FeedbackScreen() {
  const { t } = useTranslation()
  const [emailOpen, setEmailOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const feedback = useFeedback({
    onSent: () => {
      setEmailOpen(false)
      setConfirmation(t('me.feedback.sentConfirmation'))
    },
  })

  return (
    <SubScreen
      title={emailOpen ? t('me.feedback.sendFeedbackTitle') : t('me.feedback.feedbackTitle')}
    >
      {emailOpen ? (
        <>
          <FeedbackEmailFields feedback={feedback} />
          <Button
            label={feedback.sending ? t('me.feedback.sending') : t('me.feedback.send')}
            disabled={!feedback.canSend}
            onPress={feedback.send}
          />
        </>
      ) : (
        <FeedbackChooser feedback={feedback} onEmail={() => setEmailOpen(true)} />
      )}
      <Toast message={confirmation} onHide={() => setConfirmation(null)} />
    </SubScreen>
  )
}
