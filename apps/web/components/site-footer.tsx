import Link from 'next/link'

import { EmailLink } from './email-link'
import { links, sitePages } from './links'

const footerLink = 'text-secondary text-cornflower-tint/80 transition-colors hover:text-white'

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 sm:grid-cols-[1fr_auto_auto]">
        <div className="max-w-xs">
          <p className="font-heading-bold text-heading font-bold">thinkering</p>
          <p className="mt-2 text-secondary text-cornflower-tint/80">
            Learn the things you&rsquo;ve been meaning to — and grow as a learner as you do.
          </p>
          <p className="mt-4 text-secondary text-cornflower-tint/80">
            Supported by{' '}
            <a href={links.assemblyCode} className="underline hover:text-white">
              Assembly Code
            </a>
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Site pages">
          <Link href="/" className={footerLink}>
            Overview
          </Link>
          {sitePages.map((p) => (
            <Link key={p.href} href={p.href} className={footerLink}>
              {p.label}
            </Link>
          ))}
          <Link href="/privacy" className={footerLink}>
            Privacy
          </Link>
        </nav>
        <nav className="flex flex-col gap-2" aria-label="Elsewhere">
          <a href={links.betaForm} className={footerLink}>
            Join the beta
          </a>
          <a href={links.featurebase} className={footerLink}>
            Feedback &amp; roadmap
          </a>
          <a href={links.github} className={footerLink}>
            GitHub
          </a>
          <EmailLink className={footerLink} />
        </nav>
      </div>
    </footer>
  )
}
