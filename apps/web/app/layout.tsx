import type { Metadata } from 'next'
import { Arvo, Outfit } from 'next/font/google'

import './globals.css'

const arvo = Arvo({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-arvo',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'thinkering',
  description: 'Steady, real progress on the things you want to learn.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${arvo.variable} ${outfit.variable}`}>
      <body className="bg-paper font-sans text-body text-ink antialiased">{children}</body>
    </html>
  )
}
