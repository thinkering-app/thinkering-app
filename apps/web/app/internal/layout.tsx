import type { Metadata } from 'next'
import Link from 'next/link'

import { AREA_LABELS } from '@/lib/server/internal-auth'
import { unlockedAreas } from '@/lib/server/internal-session'
import { signOut } from './login/actions'

/**
 * The internal pages (docs/02 §Internal pages): reference views of things that
 * live in code — prompt templates and the activity library — each behind its
 * own password. Deliberately outside the (site) group: no site header, no
 * footer, no link from the landing page, and noindex.
 */

export const metadata: Metadata = {
  title: { default: 'Internal', template: '%s — internal' },
  robots: { index: false, follow: false },
}

const navLink = 'rounded-pill px-3 py-1.5 text-secondary text-ink-soft hover:text-ink'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  // Only what this visitor has unlocked: the nav is not a list of what exists.
  const areas = await unlockedAreas()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/internal" className="font-heading-bold text-heading font-bold text-ink">
            thinkering <span className="text-ink-soft">internal</span>
          </Link>
          {areas.length > 0 ? (
            <nav className="flex items-center gap-1" aria-label="Internal">
              {areas.map((area) => (
                <Link key={area} href={`/internal/${area}`} className={navLink}>
                  {AREA_LABELS[area]}
                </Link>
              ))}
              <form action={signOut}>
                <button type="submit" className={navLink}>
                  Sign out
                </button>
              </form>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
