import { Text, View } from 'react-native'

import { SubScreen } from '@/components/sub-screen'

/**
 * Me → Privacy (docs/01 §7, docs/08): the same content as the landing page's
 * /privacy. Reb's copy replaces this in M7; what stands here is the factual
 * summary of where data goes, so the screen is never blank or misleading.
 */
export default function PrivacyScreen() {
  return (
    <SubScreen title="Privacy">
      {SECTIONS.map((section) => (
        <View key={section.heading} className="gap-2">
          <Text className="font-heading-bold text-heading text-ink">{section.heading}</Text>
          <Text className="font-sans text-body leading-relaxed text-ink-soft">{section.body}</Text>
        </View>
      ))}
      <Text className="font-sans text-secondary text-ink-soft">
        Questions or concerns: hello@thinkering.app
      </Text>
    </SubScreen>
  )
}

const SECTIONS = [
  {
    heading: 'Where your learning lives',
    body: 'Your interests, goals, activities and answers are stored on this device. Nothing is uploaded unless you turn on backup.',
  },
  {
    heading: 'Generating activities',
    body: 'To write an activity we send the relevant parts of your interest — what you want to learn, your goals, your recent activities — to Anthropic through our server. Neither we nor Anthropic keep those requests for training; our server records only counts and token totals so we can meter usage.',
  },
  {
    heading: 'Your own key',
    body: 'If you add your own Anthropic key it stays in this device’s keychain and calls go straight to Anthropic, bypassing our server entirely.',
  },
  {
    heading: 'Anonymous usage',
    body: 'Off unless you turn it on. When on, we record which screens and features get used, how long things take in broad buckets, and activity ratings — never your text, titles, or links, and never tied to your identity.',
  },
  {
    heading: 'Feedback',
    body: 'Posts on the feedback board are handled by Featurebase and may be public. Private feedback and shared activity reports are emailed to us through Resend and not stored on our servers; a reply address is used only to reply. Sharing an activity is always an explicit action, and your own answers are left out unless you tick the box.',
  },
  {
    heading: 'Backup',
    body: 'Optional and off by default. When on, your rows sync to your own account and are deleted when you turn it off or delete the account.',
  },
]
