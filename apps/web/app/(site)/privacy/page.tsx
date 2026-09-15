import type { Metadata } from 'next'

import { EmailLink } from '../../../components/email-link'

export const metadata: Metadata = {
  title: 'Privacy',
}

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: 'Your learning data stays on your device',
    paragraphs: [
      'Everything you do in thinkering — your interests, goals, activities, and responses — is stored locally, on your device. There is no account by default, and nothing is uploaded in the background.',
      'Your data leaves the device only in the specific, deliberate ways below.',
    ],
  },
  {
    title: 'Generating content with AI',
    paragraphs: [
      'When thinkering generates an activity or updates your path, the relevant parts of your learning data (for example, your interest and goals) are sent through our server to Anthropic, which runs the AI model. Neither our server nor Anthropic stores the content of these requests or responses; our server keeps only anonymous per-device counters (calls, tokens, latency, errors) to enforce daily usage caps.',
      'If you add your own Anthropic API key, it is stored in your device’s secure keychain, calls go directly from your device to Anthropic, and our server is not involved.',
    ],
  },
  {
    title: 'Backup is optional',
    paragraphs: [
      'You can opt in to an account (email and password) to back up or sync your data. Backed-up data is readable only by you. Turning backup off deletes your server-side data; deleting the account does too.',
    ],
  },
  {
    title: 'Analytics are optional and anonymous',
    paragraphs: [
      'Usage analytics are off by default. If you opt in, we collect a fixed list of content-free events — things like “an activity was completed” with its type, duration bucket, and rating. Never interest names, goal titles, activity content, your text, URLs, or your email. The analytics identity is a random ID that is never linked to your backup account.',
    ],
  },
  {
    title: 'Sharing an activity with the developers',
    paragraphs: [
      'After an activity, you can choose to share it with us to help improve quality. Sharing sends that activity’s generated content plus your rating and comment by email to the developers; your own answers are excluded unless you tick a box to include them. Shared reports are not stored on the server. Nothing is ever shared without this explicit action.',
    ],
  },
  {
    title: 'Feedback',
    paragraphs: [
      'Community feedback (ideas, votes, comments) is posted to our public Featurebase board, which stores what you post there along with its normal technical request data — thinkering supplies only coarse context like the screen, platform, and app version.',
      'Private feedback and shared activity reports are forwarded to us by email through Resend; the content is not stored or logged on our server, and any reply email you include is used only to reply.',
    ],
  },
  {
    title: 'Retention and deletion',
    paragraphs: [
      'Deleting the app deletes your local data. Turning off backup or deleting your account deletes your server-side data. Anonymous usage counters and analytics events contain nothing that identifies you or your learning content.',
    ],
  },
]

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-lg font-bold text-ink">Privacy</h1>
      <p className="mt-6 max-w-xl text-body text-ink-soft">
        The short version: your learning is yours. thinkering is local-first, and every way data
        can leave your device is opt-in and listed here.
      </p>
      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-heading-bold text-title font-bold text-ink">{s.title}</h2>
            {s.paragraphs.map((text) => (
              <p key={text.slice(0, 24)} className="mt-3 max-w-2xl text-body text-ink-soft">
                {text}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="font-heading-bold text-title font-bold text-ink">Questions</h2>
          <p className="mt-3 text-body text-ink-soft">
            Ask anything about your data at{' '}
            <EmailLink className="text-cornflower-deep hover:underline" />.
          </p>
        </section>
      </div>
    </div>
  )
}
