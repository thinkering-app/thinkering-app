import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Platform } from 'react-native'
import { featurebasePortalUrl, type FeedbackContext } from '@thinkering/core'

import { track } from '@/analytics'
import { postFeedback } from './client'
import { useFeedbackContext } from './context'

/**
 * The behaviour behind the feedback chooser (docs/01 §2, D21), shared by the
 * two places it is offered: the global button's sheet and Me → Settings →
 * Feedback. Nothing is sent in the background — both options are a deliberate
 * tap, and the community option hides when no portal is configured.
 */

const PORTAL_URL = process.env.EXPO_PUBLIC_FEATUREBASE_PORTAL_URL
/**
 * App Review Guideline 1.2 asks for reporting and blocking on embedded
 * user-generated content. If the portal can't offer end-user reporting, this
 * flag moves it out of the WebView and into the system browser, where it is
 * the browser's content rather than ours (docs/10 Tier 6).
 */
const PORTAL_IN_BROWSER = process.env.EXPO_PUBLIC_FEATUREBASE_IN_BROWSER === 'true'

/** The address shown wherever feedback is offered, and on About. */
export const FEEDBACK_CONTACT = 'hello@thinkering.app'

const MAX_MESSAGE_CHARS = 4000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface Feedback {
  context: FeedbackContext
  /** The portal URL for this build, or null when none is configured. */
  portal: string | null
  openPortal: () => void
  message: string
  setMessage: (next: string) => void
  replyEmail: string
  setReplyEmail: (next: string) => void
  includeContext: boolean
  setIncludeContext: (next: boolean) => void
  sending: boolean
  error: string | null
  canSend: boolean
  send: () => void
}

export function useFeedback({
  onSent,
  onNavigateAway,
}: { onSent?: () => void; onNavigateAway?: () => void } = {}): Feedback {
  const { t } = useTranslation()
  const context = useFeedbackContext()
  const [message, setMessageState] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const portal = featurebasePortalUrl(PORTAL_URL, context)

  const openPortal = () => {
    if (!portal) return
    track('featurebase_opened', { screen: context.screen })
    onNavigateAway?.()
    // Expo web has no WebView; the portal opens in a new tab (docs/02).
    if (Platform.OS === 'web' || PORTAL_IN_BROWSER) void Linking.openURL(portal)
    else router.push(`/feedback/portal?url=${encodeURIComponent(portal)}`)
  }

  const send = () => {
    const text = message.trim()
    const email = replyEmail.trim()
    if (text.length === 0) return
    if (email.length > 0 && !EMAIL.test(email)) {
      setError(t('me.feedback.invalidEmail'))
      return
    }
    setError(null)
    setSending(true)
    postFeedback({
      message: text,
      ...(email ? { replyEmail: email } : {}),
      ...(includeContext ? { context } : {}),
    })
      .then(() => {
        track('email_feedback_sent', { screen: context.screen, included_context: includeContext })
        setMessageState('')
        setReplyEmail('')
        onSent?.()
      })
      .catch(() => setError(t('me.feedback.sendFailed')))
      .finally(() => setSending(false))
  }

  return {
    context,
    portal,
    openPortal,
    message,
    setMessage: (next) => setMessageState(next.slice(0, MAX_MESSAGE_CHARS)),
    replyEmail,
    setReplyEmail,
    includeContext,
    setIncludeContext,
    sending,
    error,
    canSend: !sending && message.trim().length > 0,
    send,
  }
}
