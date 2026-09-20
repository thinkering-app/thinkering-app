import type { Metadata } from 'next'
import Link from 'next/link'
import {
  libraryItemsForSection,
  LIBRARY_ITEMS,
  SECTIONS,
  type LibraryItem,
  type Section,
} from '@thinkering/core'

import { requireArea } from '@/lib/server/internal-session'

/**
 * The activity library (docs/06) as it stands in `packages/core/src/library`,
 * by section. An item can sit in two sections — Watch Along is both a Next and
 * a Strengthen — so it appears under each.
 */

export const metadata: Metadata = { title: 'Library' }

const SECTION_LABELS: Record<Section, string> = {
  next: 'Next',
  strengthen: 'Strengthen',
  go_further: 'Go further',
}

function isSection(value: string | undefined): value is Section {
  return SECTIONS.includes(value as Section)
}

const DUAL_SECTION = LIBRARY_ITEMS.filter((item) => item.sections.length > 1).map(
  (item) => item.name,
)

const pill = 'rounded-pill bg-cornflower-tint px-2.5 py-0.5 text-caption text-cornflower-deep'
const quietPill = 'rounded-pill bg-paper px-2.5 py-0.5 text-caption text-ink-soft'

function ItemCard({ item }: { item: LibraryItem }) {
  return (
    <article className="rounded-card border border-hairline bg-surface p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-heading text-heading text-ink">{item.name}</h3>
        <code className="text-caption text-ink-soft">{item.id}</code>
        <span className={quietPill}>{item.defaultActive ? 'On by default' : 'Off by default'}</span>
        {item.flavor ? <span className={quietPill}>{item.flavor}</span> : null}
        {item.usesResources ? (
          <span className={quietPill}>uses {item.resourceMedia ?? 'a'} resource</span>
        ) : null}
        {item.outcomeLabel ? <span className={quietPill}>“{item.outcomeLabel}”</span> : null}
      </div>

      <p className="mt-3 text-body text-ink">{item.overview}</p>
      <p className="mt-1 text-secondary text-ink-soft">{item.whyItHelps}</p>
      {item.activation ? (
        <p className="mt-1 text-secondary text-ink-soft">{item.activation}</p>
      ) : null}

      <dl className="mt-4 flex flex-col gap-3">
        <div>
          <dt className="text-caption font-medium text-ink">Pedagogy</dt>
          <dd className="text-secondary text-ink-soft">{item.pedagogy}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-ink">Page skeleton</dt>
          <dd className="text-secondary text-ink-soft">{item.pageSkeleton.join(' → ')}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-ink">Interactions</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {item.interactions.map((kind) => (
              <span key={kind} className={pill}>
                {kind}
              </span>
            ))}
          </dd>
        </div>
        {item.goodFor ? (
          <div>
            <dt className="text-caption font-medium text-ink">Good for</dt>
            <dd className="text-secondary text-ink-soft">{item.goodFor}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}

export default async function InternalLibrary({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  await requireArea('library')

  const { section } = await searchParams
  const selected = isSection(section) ? section : undefined
  const shown = selected ? [selected] : SECTIONS

  const tab = (href: string, label: string, current: boolean) => (
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading-bold text-display-md font-bold text-ink">Library</h1>
      <p className="mt-3 text-body text-ink-soft">
        {LIBRARY_ITEMS.length} items, in the order they appear in configure sheets.
        {DUAL_SECTION.length > 0
          ? ` An item in two sections is listed under each — ${DUAL_SECTION.join(', ')}.`
          : ''}
      </p>

      <nav className="mt-6 flex flex-wrap gap-1" aria-label="Section">
        {tab('/internal/library', 'All', !selected)}
        {SECTIONS.map((s) =>
          tab(`/internal/library?section=${s}`, SECTION_LABELS[s], selected === s),
        )}
      </nav>

      <div className="mt-8 flex flex-col gap-10">
        {shown.map((s) => {
          const items = libraryItemsForSection(s)
          return (
            <section key={s}>
              <h2 className="font-heading-bold text-title font-bold text-ink">
                {SECTION_LABELS[s]}{' '}
                <span className="font-sans text-secondary font-normal text-ink-soft">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {items.map((item) => (
                  <ItemCard key={`${s}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
