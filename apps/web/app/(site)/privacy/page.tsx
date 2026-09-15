import type { Metadata } from 'next'
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from '@thinkering/core'

import { EmailLink } from '../../../components/email-link'

export const metadata: Metadata = {
  title: 'Privacy',
}

/** The copy is shared with Me → Privacy in the app (packages/core, docs/08). */

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-lg font-bold text-ink">Privacy</h1>
      <p className="mt-6 max-w-xl text-body text-ink-soft">{PRIVACY_INTRO}</p>
      <div className="mt-10 flex flex-col gap-8">
        {PRIVACY_SECTIONS.map((s) => (
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
