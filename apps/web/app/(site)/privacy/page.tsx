import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy — thinkering',
}

// Placeholder — Reb's copy replaces this before release (docs/01 §7).
export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading-bold text-display font-bold text-ink">Privacy</h1>
      <p className="mt-4 text-body text-ink-soft">
        Your learning data stays on your device. The full policy will be published here before
        release.
      </p>
    </main>
  )
}
