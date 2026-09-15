'use client'

import { useEffect, useState } from 'react'

const INTERESTS = [
  'watercolor painting',
  'personal finance',
  'conversational Spanish',
  'the gut microbiome',
  'songwriting',
]

const TYPE_MS = 65
const HOLD_MS = 1600
const DELETE_MS = 28

// A mock intake text field that types interests in a loop.
// Static under prefers-reduced-motion.
export function InterestTyper() {
  const [text, setText] = useState(INTERESTS[0])
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setAnimate(true)
    setText('')

    let index = 0
    let phase: 'typing' | 'holding' | 'deleting' = 'typing'
    let length = 0
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const word = INTERESTS[index] ?? ''
      if (phase === 'typing') {
        length += 1
        setText(word.slice(0, length))
        if (length === word.length) phase = 'holding'
        timer = setTimeout(tick, phase === 'holding' ? HOLD_MS : TYPE_MS)
      } else if (phase === 'holding') {
        phase = 'deleting'
        timer = setTimeout(tick, DELETE_MS)
      } else {
        length -= 1
        setText(word.slice(0, length))
        if (length === 0) {
          phase = 'typing'
          index = (index + 1) % INTERESTS.length
        }
        timer = setTimeout(tick, length === 0 ? TYPE_MS * 4 : DELETE_MS)
      }
    }
    timer = setTimeout(tick, 400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div aria-hidden className="rounded-card border border-hairline bg-surface p-5 shadow-card">
      <p className="text-caption font-medium uppercase tracking-wide text-ink-soft">
        Add an interest
      </p>
      <div className="mt-3 flex items-center rounded-card border border-cornflower bg-paper px-4 py-3">
        <span className="text-body text-ink">{text}</span>
        {animate ? <span className="ml-0.5 h-5 w-0.5 animate-pulse bg-cornflower" /> : null}
      </div>
    </div>
  )
}
