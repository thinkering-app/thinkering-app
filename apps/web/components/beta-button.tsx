'use client'

import { useRef } from 'react'

import { links } from './links'

const optionStyle = 'rounded-pill px-5 py-3 text-center font-medium transition-colors'

/** "Join the beta": asks whether to try the web app now or wait for mobile. */
export function BetaButton({ className }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        Join the beta
      </button>
      {/* A native dialog: focus trap, Escape and the backdrop come with it. */}
      <dialog
        ref={dialog}
        aria-labelledby="beta-dialog-title"
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === e.currentTarget) close()
        }}
        className="w-[calc(100%-3rem)] max-w-sm rounded-card bg-paper p-0 text-ink shadow-card backdrop:bg-ink/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="beta-dialog-title" className="font-heading-bold text-title font-bold">
              Join the beta
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-pill px-2 text-title text-ink-soft hover:text-ink"
            >
              &times;
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <a
              href={links.webApp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={`${optionStyle} bg-cornflower text-white hover:bg-cornflower-deep`}
            >
              Try it out on web
            </a>
            <a
              href={links.betaForm}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={`${optionStyle} border border-hairline bg-surface text-ink hover:border-cornflower`}
            >
              Join the mobile app waiting list
            </a>
          </div>
        </div>
      </dialog>
    </>
  )
}
