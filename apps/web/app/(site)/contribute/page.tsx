import type { Metadata } from 'next'

import { EmailLink } from '../../../components/email-link'
import { links } from '../../../components/links'

export const metadata: Metadata = {
  title: 'Contribute',
}

const linkStyle = 'text-cornflower-deep hover:underline'

const WAYS = [
  {
    title: 'Ground it in the science of learning',
    wash: 'bg-leaf-tint',
    body: 'thinkering draws its activities from a library of research-backed learning strategies. Help build that grounding — and the accuracy checks around it — in the open.',
    actions: [{ label: 'Join the library discussion', href: links.featurebaseLibraryThread }],
  },
  {
    title: 'Try it, and shape it',
    wash: 'bg-cornflower-tint',
    body: 'Try this active, adaptive learning experience for your own interests, and share what works and what doesn’t.',
    actions: [
      { label: 'Join the beta', href: links.betaForm },
      { label: 'Feedback & roadmap', href: links.featurebase },
    ],
  },
  {
    title: 'Build it',
    wash: 'bg-peach-tint',
    body: 'The app is open source. Open an issue, pick one up, or start a conversation about the implementation.',
    actions: [{ label: 'GitHub', href: links.github }],
  },
]

export default function Contribute() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-lg font-bold text-ink">Contribute</h1>
      <p className="mt-6 max-w-xl text-body text-ink-soft">
        Figuring out how AI and the science of learning can help our personal learning is no easy
        task. It goes better together.
      </p>

      <div className="mt-10 flex flex-col gap-5">
        {WAYS.map((way) => (
          <section key={way.title} className={`rounded-card p-6 ${way.wash}`}>
            <h2 className="font-heading-bold text-title font-bold text-ink">{way.title}</h2>
            <p className="mt-2 max-w-xl text-body text-ink-soft">{way.body}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {way.actions.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="rounded-pill bg-surface px-4 py-2 text-secondary font-medium text-ink shadow-card transition-colors hover:text-cornflower-deep"
                >
                  {a.label}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-body text-ink-soft">
        Or just get in touch: <EmailLink className={linkStyle} />.
      </p>
    </div>
  )
}
