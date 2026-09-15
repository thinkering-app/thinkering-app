// Every external URL the site links to, in one place.
export const links = {
  betaForm: 'https://forms.gle/nbahBWqt4JXb1XKb9',
  featurebase: 'https://thinkering.featurebase.app/',
  featurebaseLibraryThread:
    'https://thinkering.featurebase.app/p/science-of-learning-library-discussion-thread-2026',
  assemblyCode: 'https://www.assemblycode.org/',
  linkedin: 'https://www.linkedin.com/in/rebeccalhao',
  github: 'https://github.com/thinkering-app/thinkering-app',
} as const

export const overviewSections = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#why-it-works', label: 'Why it works' },
  { href: '/#principles', label: 'Principles' },
  { href: '/#project', label: 'Project' },
] as const

export const sitePages = [
  { href: '/about', label: 'About' },
  { href: '/contribute', label: 'Contribute' },
  { href: '/contact', label: 'Contact' },
] as const
