import type { Metadata } from 'next'

import { EmailLink } from '../../../components/email-link'
import { links } from '../../../components/links'

export const metadata: Metadata = {
  title: 'Contact',
}

export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-lg font-bold text-ink">Contact</h1>
      <p className="mt-6 max-w-xl text-body text-ink-soft">
        I would love to hear about your experiences learning in your adult life, where thinkering
        is and isn&rsquo;t working for you, ideas for collaboration, and more.
      </p>
      <p className="mt-4 text-body text-ink-soft">
        Please don&rsquo;t hesitate to reach out at{' '}
        <EmailLink className="text-cornflower-deep hover:underline" />.
      </p>
      <p className="mt-4 text-body text-ink-soft">
        You can also find me on{' '}
        <a href={links.linkedin} className="text-cornflower-deep hover:underline">
          LinkedIn
        </a>
        .
      </p>
    </div>
  )
}
