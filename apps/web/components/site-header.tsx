'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { links, overviewSections, sitePages } from './links'

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  const navLink = (href: string, label: string) => {
    const current = pathname === href
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? 'page' : undefined}
        className={`rounded-pill px-3 py-1.5 text-secondary transition-colors ${
          current ? 'bg-cornflower-tint text-cornflower-deep' : 'text-ink-soft hover:text-ink'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="font-heading-bold text-heading font-bold text-ink">
          thinkering
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Site">
          {/* Overview: link home, hover/focus reveals section jumps. */}
          <div className="group relative">
            {navLink('/', 'Overview')}
            <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="w-44 rounded-card border border-hairline bg-surface p-2 shadow-card">
                {overviewSections.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="block rounded-pill px-3 py-1.5 text-secondary text-ink-soft hover:bg-cornflower-tint hover:text-cornflower-deep"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {sitePages.map((p) => navLink(p.href, p.label))}
          <a
            href={links.betaForm}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded-pill bg-cornflower px-4 py-1.5 text-secondary font-medium text-white transition-colors hover:bg-cornflower-deep"
          >
            Join the beta
          </a>
        </nav>

        <button
          type="button"
          className="rounded-pill px-3 py-1.5 text-secondary text-ink sm:hidden"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen ? (
        <nav
          className="border-t border-hairline bg-paper px-6 py-4 sm:hidden"
          aria-label="Site, expanded"
        >
          <div className="flex flex-col gap-1">
            {[{ href: '/', label: 'Overview' }, ...sitePages].map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`rounded-pill px-3 py-2 ${
                  pathname === p.href ? 'bg-cornflower-tint text-cornflower-deep' : 'text-ink'
                }`}
              >
                {p.label}
              </Link>
            ))}
            <a
              href={links.betaForm}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 self-start rounded-pill bg-cornflower px-4 py-2 font-medium text-white"
            >
              Join the beta
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
