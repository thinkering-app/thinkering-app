import Link from 'next/link'

// Placeholder landing — real copy from Reb lands with WP7.1 (docs/09).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between px-6 py-16">
      <div>
        <h1 className="font-heading-bold text-display font-bold text-ink">thinkering</h1>
        <p className="mt-4 max-w-md text-title text-ink-soft">
          Steady, real progress on the things you want to learn, in the time you actually have.
        </p>
      </div>
      <footer className="flex gap-6 text-secondary text-ink-soft">
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <a href="mailto:hello@thinkering.app" className="hover:text-ink">
          Contact
        </a>
      </footer>
    </main>
  )
}
