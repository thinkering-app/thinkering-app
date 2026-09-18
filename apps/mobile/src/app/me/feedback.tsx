import { useState } from 'react'

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
  const [emailOpen, setEmailOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const feedback = useFeedback({
    onSent: () => {
      setEmailOpen(false)
      setConfirmation('Sent — thank you.')
    },
  })

  return (
    <SubScreen title={emailOpen ? 'Send feedback' : 'Feedback'}>
      {emailOpen ? (
        <>
          <FeedbackEmailFields feedback={feedback} />
          <Button
            label={feedback.sending ? 'Sending…' : 'Send'}
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
