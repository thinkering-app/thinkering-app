import { useState } from 'react'

import { Button } from '@/components/button'
import { Sheet } from '@/components/sheet'
import { Toast } from '@/components/toast'
import { FeedbackChooser, FeedbackEmailFields } from './parts'
import { useFeedback } from './use-feedback'

/**
 * The feedback chooser as a sheet, for the global button (docs/01 §2, D21):
 * post publicly on the Featurebase board, or send us a private email. The same
 * two options sit on Me → Settings → Feedback as a pushed screen — both build
 * on `useFeedback`, so the choices can't drift apart.
 */

export function FeedbackFlow({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [emailOpen, setEmailOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const feedback = useFeedback({
    onNavigateAway: onClose,
    onSent: () => {
      setEmailOpen(false)
      onClose()
      setConfirmation('Sent — thank you.')
    },
  })

  const closeEmail = () => {
    setEmailOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={emailOpen ? closeEmail : onClose}
        title={emailOpen ? 'Send feedback' : 'Feedback'}
        footer={
          emailOpen ? (
            <Button
              label={feedback.sending ? 'Sending…' : 'Send'}
              disabled={!feedback.canSend}
              onPress={feedback.send}
            />
          ) : undefined
        }
      >
        {emailOpen ? (
          <FeedbackEmailFields feedback={feedback} />
        ) : (
          <FeedbackChooser feedback={feedback} onEmail={() => setEmailOpen(true)} />
        )}
      </Sheet>
      <Toast message={confirmation} onHide={() => setConfirmation(null)} />
    </>
  )
}
