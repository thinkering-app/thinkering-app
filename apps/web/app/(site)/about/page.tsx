import type { Metadata } from 'next'
import Link from 'next/link'

import { EmailLink } from '../../../components/email-link'
import { links } from '../../../components/links'

export const metadata: Metadata = {
  title: 'About',
}

const PRINCIPLES = [
  {
    title: 'User control and choice',
    accent: 'border-cornflower',
    paragraphs: [
      'Learning is personal. You should have control over how and what you learn and consume — especially as AI does more than ever, sometimes even thinking for us. Your needs, preferences, and own skill-building belong at the center. thinkering offers suggestions for ease of use, but prioritizes customization and control, so you can use it in ways that work for you.',
    ],
  },
  {
    title: 'Build the science of learning into content and interactions',
    accent: 'border-leaf',
    paragraphs: [
      'Education research has found a lot about how people learn, across many contexts and domains. Yet much of it isn’t broadly known or accessible for everyday learning. thinkering works to bring these insights into our learning — both in the app’s own design and in the content it creates.',
    ],
  },
  {
    title: 'Privacy-centered',
    accent: 'border-sun',
    paragraphs: [
      'A lot of technology is built around capturing our attention and selling our data. thinkering joins the technology that pushes back on that model. Your data is local to your device by default — private to you — and you can opt in to an account for backup or syncing. Analytics (purely for product improvement, never shared) are also opt-in. To generate AI content, data passes through a server and Anthropic processes it, but it isn’t saved in either place.',
    ],
  },
  {
    title: 'Be intentional and transparent about generative AI use',
    accent: 'border-peach',
    paragraphs: [
      'thinkering integrates generative AI (currently Anthropic’s Claude) to provide its services, and uses it in development for its coding capabilities.',
      'We use it in the app because it can create adaptive content, sift through and apply the science of learning, and work across a wide range of domains. There are real concerns about how AI is affecting learning — I aim for thinkering to contribute to the kind of AI integration that grows people’s knowledge and capabilities instead of replacing them.',
      'And if you feel uncomfortable with the changes AI has been bringing, I’m with you. I’m continually trying to understand its environmental and societal impacts, reduce resource usage, and address accuracy and bias. I’ll keep this section updated as I learn more and improve my processes.',
    ],
  },
  {
    title: 'Not-for-profit and open source',
    accent: 'border-cornflower-deep',
    paragraphs: [
      'We want this model of learning to be accessible and useful for as many people as possible, so the core capabilities stay free. Generative AI queries and development do cost money, so we’ll keep exploring funding — potentially a paid option for people who want to support the project, never gating important functionality.',
      'The software is open source, so the implementation can reflect these commitments — and we welcome collaboration as we all figure out how to use AI responsibly and effectively for personal learning.',
    ],
  },
]

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-lg font-bold text-ink">About</h1>

      <div className="mt-6 flex flex-col gap-4 text-body text-ink-soft">
        <p>
          <strong className="font-sans-semibold font-semibold text-ink">thinkering</strong> is a
          non-profit, open source app built by Rebecca Hao, with the support of{' '}
          <a
            href={links.assemblyCode}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cornflower-deep hover:underline"
          >
            Assembly Code
          </a>
          . The goal: create free and responsible technology that helps people learn — and grow our
          learning skills while we do it.
        </p>
        <p>
          thinkering introduces a model of personal learning that provides some structure, but is
          ultimately deeply adaptive and customizable — made possible by thoughtfully integrated
          generative AI.
        </p>
        <p>
          The app is still early and in development, so feedback and conversations really help make
          it more useful and effective. Please reach out through the{' '}
          <Link href="/contact" className="text-cornflower-deep hover:underline">
            contact page
          </Link>
          , at <EmailLink className="text-cornflower-deep hover:underline" />, or{' '}
          <a
            href={links.featurebase}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cornflower-deep hover:underline"
          >
            join the discussion
          </a>
          .
        </p>
      </div>

      <h2 className="mt-16 font-heading-bold text-display-md font-bold text-ink">Principles</h2>
      <div className="mt-8 flex flex-col gap-10">
        {PRINCIPLES.map((p) => (
          <section key={p.title} className={`border-l-4 pl-5 ${p.accent}`}>
            <h3 className="font-heading-bold text-title font-bold text-ink">{p.title}</h3>
            {p.paragraphs.map((text) => (
              <p key={text.slice(0, 24)} className="mt-3 text-body text-ink-soft">
                {text}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
