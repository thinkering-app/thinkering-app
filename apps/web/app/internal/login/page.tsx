import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { areaOf, AREA_LABELS } from '@/lib/server/internal-auth'
import { unlockedAreas } from '@/lib/server/internal-session'
import { signIn } from './actions'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

const ERRORS: Record<string, string> = {
  wrong: 'That password does not open anything here.',
  rate: 'Too many attempts. Try again in a few minutes.',
}

export default async function InternalLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  const wanted = areaOf(next ?? '')
  // Already in: only bounce for a page this visitor has actually unlocked.
  const unlocked = await unlockedAreas()
  if (wanted ? unlocked.includes(wanted) : unlocked.length > 0) redirect(next ?? '/internal')

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-heading-bold text-title font-bold text-ink">
        {wanted ? AREA_LABELS[wanted] : 'Internal pages'}
      </h1>

      <form
        action={signIn}
        className="mt-6 rounded-card border border-hairline bg-surface p-6 shadow-card"
      >
        <input type="hidden" name="next" value={next ?? '/internal'} />
        <label className="flex flex-col gap-1.5">
          <span className="text-secondary font-medium text-ink">Password</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-card border border-hairline bg-paper px-4 py-2.5 text-body text-ink outline-none transition-colors focus:border-cornflower"
          />
        </label>

        {error ? (
          <p
            className="mt-3 rounded-card bg-peach-tint px-3 py-2 text-secondary text-ink"
            role="alert"
          >
            {ERRORS[error] ?? 'Something went wrong.'}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-5 w-full rounded-pill bg-cornflower px-4 py-2.5 text-secondary font-medium text-white transition-colors hover:bg-cornflower-deep"
        >
          Continue
        </button>
      </form>
    </div>
  )
}
