'use client'

import { useState } from 'react'

// A picture of the app beside the hero: Today for one interest, and a page of
// the first Next activity. Both are built from the app's own components' class
// lists (apps/mobile: today.tsx, activity-card.tsx, section-header.tsx,
// player.tsx, mcq.tsx) at phone size, then scaled down — so it reads as a
// screenshot and stays in the design tokens. Keep the content true to the
// product: goal lines are goal titles, each card is a real library item.

type Section = 'next' | 'strengthen' | 'go_further'

const GOALS = {
  learns: 'See how a model learns from examples',
  predicts: 'Know how a model picks the next word',
  makesUp: 'Know why models make things up',
}

// Library items, for whoever edits this: guided-discovery, mini-case ·
// explain-back, compare-contrast · in-the-wild, teach-back (docs/06).
const TODAY: {
  section: Section
  label: string
  cards: { title: string; goal: string; min: number }[]
}[] = [
  {
    section: 'next',
    label: 'Next',
    cards: [
      { title: 'Confidently made up', goal: GOALS.makesUp, min: 6 },
      { title: 'The invented court cases', goal: GOALS.makesUp, min: 5 },
    ],
  },
  {
    section: 'strengthen',
    label: 'Strengthen',
    cards: [
      { title: 'One word at a time', goal: GOALS.predicts, min: 4 },
      { title: 'Learning vs. looking up', goal: GOALS.learns, min: 5 },
    ],
  },
  {
    section: 'go_further',
    label: 'Go further',
    cards: [
      { title: 'Your keyboard’s guesses', goal: GOALS.predicts, min: 5 },
      { title: 'Explain it to a skeptic', goal: GOALS.learns, min: 6 },
    ],
  },
]

const ACCENT: Record<Section, { swatch: string; chip: string }> = {
  next: { swatch: 'bg-cornflower', chip: 'bg-cornflower-tint' },
  strengthen: { swatch: 'bg-leaf', chip: 'bg-leaf-tint' },
  go_further: { swatch: 'bg-peach', chip: 'bg-peach-tint' },
}

// Page 2 of "Confidently made up": a leading question before the idea gets
// its name (guided discovery: scenario → leading questions → reveal → check).
const PAGE_COUNT = 6
const PAGE_INDEX = 1
const OPTIONS = [
  { id: 'a', label: '“…I don’t know who Dr. Marsh is.”' },
  { id: 'b', label: '“…people who nap for 20 minutes remember more.”' },
  { id: 'c', label: 'Nothing — it stops there.' },
]
const CORRECT = 'b'

/**
 * Phones sit side by side (scrolling on a narrow screen) and overlap from lg,
 * where the hero has a column for them. `--s` is the scale of a 402×874 screen
 * (iPhone 16 Pro) in a 10px frame.
 */
export function AppPreview() {
  return (
    <figure
      aria-label="The thinkering app: Today for “How AI works”, and a page of an activity"
      className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [--s:0.66] [scrollbar-width:none] sm:justify-center sm:overflow-visible sm:[--s:0.68] lg:relative lg:mx-0 lg:block lg:h-[calc(894px*var(--s)+56px)] lg:w-[calc(844px*var(--s)-56px)] lg:p-0 lg:[--s:0.6]"
    >
      <Phone className="lg:absolute lg:left-0 lg:top-0" hidden>
        <TodayScreen />
      </Phone>
      <Phone className="lg:absolute lg:right-0 lg:top-14">
        <ActivityScreen />
      </Phone>
    </figure>
  )
}

function Phone({
  children,
  className,
  hidden = false,
}: {
  children: React.ReactNode
  className?: string
  hidden?: boolean
}) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={`relative h-[calc(894px*var(--s))] w-[calc(422px*var(--s))] shrink-0 snap-center ${className ?? ''}`}
    >
      <div className="absolute left-0 top-0 h-[894px] w-[422px] origin-top-left scale-[var(--s)] rounded-[56px] bg-ink p-2.5 shadow-card">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[46px] bg-paper">
          <StatusBar />
          {children}
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div
      aria-hidden
      className="relative flex h-[54px] shrink-0 items-center justify-between px-9 pt-1"
    >
      <span className="font-sans-semibold text-secondary font-semibold text-ink">9:41</span>
      <span className="absolute left-1/2 top-3 h-8 w-28 -translate-x-1/2 rounded-pill bg-ink" />
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-0.5">
          <span className="h-1.5 w-[3px] rounded-pill bg-ink" />
          <span className="h-2 w-[3px] rounded-pill bg-ink" />
          <span className="h-2.5 w-[3px] rounded-pill bg-ink" />
          <span className="h-3 w-[3px] rounded-pill bg-ink" />
        </span>
        <span className="flex h-3 w-6 items-center rounded-[4px] border border-ink/50 p-[1.5px]">
          <span className="h-full w-4/5 rounded-[2px] bg-ink" />
        </span>
      </span>
    </div>
  )
}

function TodayScreen() {
  return (
    <>
      <div className="flex flex-col gap-4 px-5 pt-4">
        <p className="font-heading-bold text-display font-bold text-ink">Today</p>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2">
            <span className="rounded-pill bg-cornflower px-4 py-2 font-sans-medium text-secondary font-medium text-white">
              How AI works
            </span>
            <span className="rounded-pill border border-hairline bg-surface px-4 py-2 font-sans-medium text-secondary font-medium text-ink">
              Spanish
            </span>
          </div>
          <span className="rounded-pill border border-hairline bg-surface px-3 py-2 text-ink-soft">
            <Icon name="add" className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
        {TODAY.map((row) => (
          <div key={row.section} className="flex flex-col gap-2">
            <div className="px-3">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="font-heading-bold text-heading font-bold text-ink">{row.label}</p>
                <Icon name="options" className="h-[18px] w-[18px] text-ink-soft" />
              </div>
            </div>
            <div className="flex gap-3 px-5">
              {row.cards.map((card) => (
                <div
                  key={card.title}
                  className="flex w-72 shrink-0 flex-col gap-2 rounded-card border border-hairline bg-surface p-5 shadow-card"
                >
                  <span className={`mb-1 h-1.5 w-8 rounded-pill ${ACCENT[row.section].swatch}`} />
                  <p className="font-heading text-heading text-ink">{card.title}</p>
                  <p className="text-secondary text-ink-soft">{card.goal}</p>
                  <div className="mt-auto flex pt-1">
                    <span
                      className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 ${ACCENT[row.section].chip}`}
                    >
                      <Icon name="time" className="h-[13px] w-[13px] text-ink-soft" />
                      <span className="text-caption text-ink">{card.min} min</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TabBar />
    </>
  )
}

function TabBar() {
  const tabs = [
    { label: 'Today', icon: 'sunny' },
    { label: 'Path', icon: 'map' },
    { label: 'History', icon: 'time' },
    { label: 'Me', icon: 'person' },
  ] as const
  return (
    <div className="flex shrink-0 justify-around border-t border-hairline bg-surface pb-8 pt-2">
      {tabs.map((tab, i) => (
        <span
          key={tab.label}
          className={`flex w-16 flex-col items-center gap-0.5 ${i === 0 ? 'text-cornflower' : 'text-ink-soft'}`}
        >
          <Icon name={tab.icon} className="h-6 w-6" />
          <span className="font-sans-medium text-caption font-medium">{tab.label}</span>
        </span>
      ))}
    </div>
  )
}

function ActivityScreen() {
  // Opens answered — the likely wrong guess beside the right one — so the
  // feedback shows without a tap. Tapping another option still works.
  const [chosen, setChosen] = useState<string | null>('a')

  return (
    <>
      <div aria-hidden className="flex items-center gap-3 px-5 pt-2">
        <Icon name="close" className="h-[22px] w-[22px] text-ink-soft" />
        <div className="flex flex-1 gap-1">
          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-pill ${
                i < PAGE_INDEX
                  ? 'bg-cornflower-deep'
                  : i === PAGE_INDEX
                    ? 'bg-cornflower'
                    : 'bg-hairline'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-hidden px-5 pt-6">
        <p className="text-body text-ink">
          Picture a model trained only to predict the next word. It’s handed the start of a sentence
          about a researcher who doesn’t exist:
        </p>
        <div className="rounded-card bg-sun-tint p-4">
          <p className="text-body italic text-ink">
            “Dr. Elena Marsh’s 2011 study of sleep found that…”
          </p>
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="font-sans-medium text-body font-medium text-ink">
            What is it most likely to write next?
          </legend>
          <div role="radiogroup" className="mt-3 flex flex-col gap-2">
            {OPTIONS.map((option) => {
              const picked = chosen === option.id
              const isCorrect = option.id === CORRECT
              const tone =
                chosen === null
                  ? 'border-hairline bg-surface hover:border-cornflower'
                  : isCorrect
                    ? 'border-leaf bg-leaf-tint'
                    : picked
                      ? 'border-peach bg-peach-tint'
                      : 'border-hairline bg-surface'
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => setChosen(option.id)}
                  className={`flex items-center gap-3 rounded-card border p-4 text-left transition-colors ${tone}`}
                >
                  <span className="flex-1 text-body text-ink">{option.label}</span>
                  {chosen !== null && (isCorrect || picked) ? (
                    <Icon
                      name={isCorrect ? 'check' : 'cross'}
                      className={`h-[18px] w-[18px] shrink-0 ${isCorrect ? 'text-leaf' : 'text-peach'}`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          {chosen !== null ? (
            <p aria-live="polite" className="text-secondary text-ink-soft">
              It keeps going. Each word is picked because it’s likely after the words before it —
              nothing checks whether it’s true. A specific, confident answer is the likeliest way to
              finish a sentence like this.
            </p>
          ) : null}
        </fieldset>
      </div>

      <div aria-hidden className="flex shrink-0 items-center gap-3 px-5 pb-10 pt-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-pill border border-hairline text-ink">
          <Icon name="back" className="h-5 w-5" />
        </span>
        <span className="flex-1 rounded-pill bg-cornflower px-6 py-3 text-center font-sans-medium text-body font-medium text-white">
          Continue
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-pill border border-hairline text-cornflower-deep">
          <Icon name="help" className="h-[22px] w-[22px]" />
        </span>
      </div>
    </>
  )
}

// Stand-ins for the app's Ionicons outlines, drawn in the current text colour.
const PATHS: Record<string, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  options: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sunny: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  map: <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.3-1.1.9-1.1 1.6v.4" />
      <circle cx="12" cy="16.6" r=".4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.7 2.7L16 9.5" />
    </>
  ),
  cross: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </>
  ),
}

function Icon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
