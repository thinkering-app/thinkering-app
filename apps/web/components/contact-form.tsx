'use client'

import { useState } from 'react'

/**
 * The contact form (docs/01 §8): posts to /api/contact, which forwards it to
 * contact@thinkering.app through Resend. Nothing is stored, here or there.
 */

const field =
  'w-full rounded-card border border-hairline bg-paper px-4 py-2.5 text-body text-ink outline-none transition-colors focus:border-cornflower'
const label = 'text-secondary font-medium text-ink'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function ContactForm() {
  const [state, setState] = useState<State>('idle')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          message: String(data.get('message') ?? ''),
          website: String(data.get('website') ?? ''),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      form.reset()
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-card border border-hairline bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Name</span>
            <input name="name" required maxLength={120} autoComplete="name" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={field}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Message</span>
          <textarea name="message" required rows={6} maxLength={4000} className={field} />
        </label>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-pill bg-cornflower px-6 py-2.5 font-medium text-white transition-colors hover:bg-cornflower-deep disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'Send'}
          </button>
          <p aria-live="polite" className="text-secondary text-ink-soft">
            {state === 'sent' ? 'Sent. Thanks for the message!' : null}
            {state === 'error' ? 'That didn’t work. Please try again later.' : null}
          </p>
        </div>
      </div>
    </form>
  )
}
