/**
 * The privacy copy (docs/08), in one place because it has to appear in two:
 * the landing `/privacy` page and Me → Privacy in the app. They drifted once
 * already; sharing the text is cheaper than remembering to sync it.
 *
 * Plain language, no legalese, and specific enough to be checkable — every
 * claim here matches something in the code.
 */

export const PRIVACY_CONTACT_EMAIL = 'hello@thinkering.app'

export const PRIVACY_INTRO =
  'The short version: your learning is yours. thinkering is local-first, and every way data can leave your device is listed here, along with how to turn it off.'

export interface PrivacySection {
  title: string
  paragraphs: string[]
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
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
    title: 'Analytics are anonymous, and you can turn them off',
    paragraphs: [
      'Anonymous usage analytics are on by default. You can turn them off at any time in the app under Me → Settings → Account and data; from then on nothing is sent.',
      'We collect a fixed list of content-free events — things like “an activity was completed” with its type, a duration bucket, and your rating. Never interest names, goal titles, activity content, your text, URLs, or your email. Durations are rounded into buckets rather than sent as exact timings.',
      'Analytics are processed by PostHog on their US servers. The analytics identity is a random ID generated on your device that is never linked to your backup account or your email. We tell PostHog not to record your IP address and not to look up your location, and there is no automatic click tracking — the only events that exist are the ones on that fixed list.',
    ],
  },
  {
    title: 'Session replays are a separate choice',
    paragraphs: [
      'Session replays are off by default and separate from usage analytics. If you turn them on in the app under Account and data, the app records your screen while you use it and sends the recordings to PostHog, so we can find problems and see how learning in thinkering feels.',
      'Because a recording shows the screen, we can see your activities and what you type. Your email address, passwords, and API key are hidden from recordings, and recordings carry the same random ID as analytics — not your account or your email. Turning replays off stops recording straight away.',
    ],
  },
  {
    title: 'Sharing an activity with the developers',
    paragraphs: [
      'After an activity, you can choose to send it to us to help improve quality. Sending shares that activity’s generated content plus your rating and note by email to the developers; your own answers are never included. Shared reports are not stored on the server. Nothing is shared without this explicit action.',
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
