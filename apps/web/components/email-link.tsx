'use client'

import { useEffect, useState } from 'react'

// Assembled client-side so the address never appears in the served HTML.
const PARTS = ['hello', 'thinkering', 'app'] as const

export function EmailLink({ className }: { className?: string }) {
  const [address, setAddress] = useState<string>()

  useEffect(() => {
    setAddress(`${PARTS[0]}@${PARTS[1]}.${PARTS[2]}`)
  }, [])

  if (!address) return <span className={className}>hello at thinkering dot app</span>
  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  )
}
