'use client'

import { useState } from 'react'

type GoalStatus = 'strengthened' | 'introduced' | 'not_started'

// Three different kinds of interest — a craft, a conceptual/applied domain, a
// language — each with a pedagogically ordered path and some progress made.
const SAMPLES: { interest: string; goals: { title: string; status: GoalStatus }[] }[] = [
  {
    interest: 'Watercolor painting',
    goals: [
      { title: 'Get to know your paints, brushes, and paper', status: 'strengthened' },
      { title: 'Control water and pigment in flat washes', status: 'introduced' },
      { title: 'Mix clean colors from a limited palette', status: 'introduced' },
      { title: 'Paint simple forms with light and shadow', status: 'not_started' },
      { title: 'Compose and finish a small landscape', status: 'not_started' },
    ],
  },
  {
    interest: 'Personal finance',
    goals: [
      { title: 'See where your money actually goes', status: 'strengthened' },
      { title: 'Build a spending plan you can keep', status: 'introduced' },
      { title: 'Set up an emergency fund', status: 'introduced' },
      { title: 'Understand retirement accounts and tax advantages', status: 'not_started' },
      { title: 'Start investing with low-cost index funds', status: 'not_started' },
    ],
  },
  {
    interest: 'Conversational Spanish',
    goals: [
      { title: 'Introduce yourself and ask simple questions', status: 'strengthened' },
      { title: 'Order food and find your way around', status: 'introduced' },
      { title: 'Talk about your day in the present tense', status: 'introduced' },
      { title: 'Tell simple stories about the past', status: 'not_started' },
      { title: 'Hold a ten-minute conversation', status: 'not_started' },
    ],
  },
]

const STATUS_CARD: Record<GoalStatus, string> = {
  strengthened: 'bg-cornflower-deep text-white',
  introduced: 'bg-cornflower-tint text-ink',
  not_started: 'border border-hairline bg-surface text-ink',
}

const STATUS_LABEL: Record<GoalStatus, { text: string; className: string }> = {
  strengthened: { text: 'strengthened', className: 'text-cornflower-tint' },
  introduced: { text: 'introduced', className: 'text-cornflower-deep' },
  not_started: { text: 'not started', className: 'text-ink-soft' },
}

export function PathPreview() {
  const [selected, setSelected] = useState(0)
  const sample = SAMPLES[selected] ?? SAMPLES[0]
  if (!sample) return null

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Example interests">
        {SAMPLES.map((s, i) => (
          <button
            key={s.interest}
            type="button"
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`rounded-pill px-4 py-1.5 text-secondary font-medium transition-colors ${
              i === selected
                ? 'bg-cornflower text-white'
                : 'border border-hairline bg-surface text-ink-soft hover:text-ink'
            }`}
          >
            {s.interest}
          </button>
        ))}
      </div>
      <ol className="mt-4 flex flex-col gap-2">
        {sample.goals.map((goal) => {
          const label = STATUS_LABEL[goal.status]
          return (
            <li
              key={goal.title}
              className={`rounded-card px-4 py-3 shadow-card ${STATUS_CARD[goal.status]}`}
            >
              <p className="font-heading text-secondary">{goal.title}</p>
              <p className={`mt-0.5 text-caption ${label.className}`}>{label.text}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
