import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AREA_LABELS, type InternalArea } from '@/lib/server/internal-auth'
import { unlockedAreas } from '@/lib/server/internal-session'

const DESCRIPTIONS: Record<InternalArea, string> = {
  prompts: 'Every generation kind, its current version, and what the model is sent.',
  library: 'The activity library by section, with the pedagogy behind each item.',
}

export default async function InternalIndex() {
  // Only what this visitor has unlocked — a page they have no password for is
  // not listed here, so the index never advertises what else exists.
  const unlocked = await unlockedAreas()
  if (unlocked.length === 0) redirect('/internal/login')

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading-bold text-display-md font-bold text-ink">Internal</h1>
      <p className="mt-3 text-body text-ink-soft">
        Reference views of what lives in code. Not linked from the site.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {unlocked.map((area) => (
          <Link
            key={area}
            href={`/internal/${area}`}
            className="rounded-card border border-hairline bg-surface p-5 transition-colors hover:border-cornflower"
          >
            <span className="font-heading text-heading text-ink">{AREA_LABELS[area]}</span>
            <span className="mt-1 block text-secondary text-ink-soft">{DESCRIPTIONS[area]}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
