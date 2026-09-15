import Link from 'next/link'

import { links, sitePages } from './links'

const footerLink = 'text-secondary text-cornflower-tint/80 transition-colors hover:text-white'

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xs">
          <p className="font-heading-bold text-heading font-bold">thinkering</p>
          <p className="mt-2 text-secondary text-cornflower-tint/80">
            Learn the things you&rsquo;ve been meaning to — and grow as a learner as you do.
          </p>
          <p className="mt-2 text-secondary text-cornflower-tint/80">
            Supported by{' '}
            <a
              href={links.assemblyCode}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Assembly Code
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Site pages">
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
      </div>
    </footer>
  )
}
