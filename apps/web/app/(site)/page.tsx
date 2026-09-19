import Link from 'next/link'

import { AppPreview } from '../../components/app-preview'
import { EmailLink } from '../../components/email-link'
import { InterestTyper } from '../../components/interest-typer'
import { links } from '../../components/links'
import { PathPreview } from '../../components/path-preview'

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyItWorks />
      <Principles />
      <Project />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="blob -left-24 top-8 h-72 w-72 bg-cornflower-tint" />
      <div className="blob -right-16 top-40 h-64 w-64 bg-peach-tint" />
      <div className="blob bottom-0 left-1/3 h-56 w-56 bg-sun-tint" />
      {/* One column below lg, with the preview between the pitch and the card;
          from lg the preview takes a right-hand column beside both. */}
      <div className="relative mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-y-14 px-6 pb-20 pt-20 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-12 lg:pt-20">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 className="max-w-3xl font-heading-bold text-display-lg font-bold text-ink">
            Learn the things you&rsquo;ve been meaning to.
          </h1>
          <p className="mt-5 max-w-xl text-title text-ink-soft">
            Make consistent progress with short, effective daily activities grounded in how we
            learn.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={links.betaForm}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill bg-cornflower px-6 py-3 font-medium text-white transition-colors hover:bg-cornflower-deep"
            >
              Join the beta
            </a>
            <a
              href="#how-it-works"
              className="rounded-pill border border-hairline bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-cornflower"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <AppPreview />
        </div>
        <div className="max-w-xl self-start rounded-card border border-hairline bg-surface p-6 shadow-card">
          <span className="block h-2 w-10 rounded-pill bg-sun" />
          <p className="mt-4 font-heading text-heading text-ink">
            And grow as a learner as you do.
          </p>
          <p className="mt-2 text-secondary text-ink-soft">
            AI can help connect us with new knowledge and ways to approach it. But we should stay in
            control of — and can keep getting better at — what and how we learn.
          </p>
        </div>
      </div>
    </section>
  )
}

function Step({
  number,
  title,
  body,
  children,
}: {
  number: number
  title: string
  body?: string
  children?: React.ReactNode
}) {
  return (
    <li className="grid items-start gap-6 sm:grid-cols-2 sm:gap-12">
      <div className="max-w-md">
        <div className="flex items-baseline gap-3">
          <span className="font-heading-bold text-title font-bold text-cornflower">{number}</span>
          <h3 className="font-heading-bold text-title font-bold text-ink">{title}</h3>
        </div>
        {body ? <p className="mt-3 text-body text-ink-soft">{body}</p> : null}
      </div>
      <div>{children}</div>
    </li>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-ink">How it works</h2>
        <ol className="mt-12 flex flex-col gap-16">
          <Step
            number={1}
            title="Add an interest, or a few"
            body="Anything you’ve been meaning to learn — a skill, a language, a subject you keep circling back to."
          >
            <InterestTyper />
          </Step>
          <Step
            number={2}
            title="thinkering sketches a direction"
            body="A path of goals that’s pedagogically sound for that kind of learning — and it evolves as you go, not a fixed syllabus."
          >
            <PathPreview />
          </Step>
          <Step
            number={3}
            title="Make progress every day"
            body="Short, interactive activities built from the science of learning — not another feed to scroll."
          >
            <ActivityMock />
          </Step>
          <Step
            number={4}
            title="Build your own routine"
            body="Balance new ground, reinforcement, and real-world use — and figure out what actually helps you learn."
          >
            <RoutineMock />
          </Step>
        </ol>
      </div>
    </section>
  )
}

function ActivityMock() {
  return (
    <div aria-hidden className="rounded-card border border-hairline bg-paper p-5 shadow-card">
      <div className="flex gap-1.5">
        <span className="h-1.5 flex-1 rounded-pill bg-leaf" />
        <span className="h-1.5 flex-1 rounded-pill bg-leaf" />
        <span className="h-1.5 flex-1 rounded-pill bg-hairline" />
        <span className="h-1.5 flex-1 rounded-pill bg-hairline" />
      </div>
      <p className="mt-4 text-caption font-medium uppercase tracking-wide text-leaf">
        Strengthen · 5 min
      </p>
      <p className="mt-2 font-heading text-heading text-ink">Mixing clean greens</p>
      <p className="mt-2 text-secondary text-ink-soft">
        From memory: which pair mixes a fresher green?
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <span className="rounded-card border border-cornflower-deep bg-cornflower-tint px-4 py-2.5 text-secondary text-ink">
          Phthalo blue + lemon yellow
        </span>
        <span className="rounded-card border border-hairline bg-surface px-4 py-2.5 text-secondary text-ink">
          Ultramarine + yellow ochre
        </span>
      </div>
    </div>
  )
}

function RoutineMock() {
  const sections = [
    {
      name: 'Next',
      accent: 'bg-cornflower',
      wash: 'bg-cornflower-tint',
      text: 'One new step on your path',
    },
    {
      name: 'Strengthen',
      accent: 'bg-leaf',
      wash: 'bg-leaf-tint',
      text: 'Revisit what you’ve met, so it sticks',
    },
    {
      name: 'Go further',
      accent: 'bg-peach',
      wash: 'bg-peach-tint',
      text: 'Put it to use in your own life',
    },
  ]
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <div key={s.name} className={`flex items-center gap-4 rounded-card px-5 py-4 ${s.wash}`}>
          <span className={`h-3 w-3 shrink-0 rounded-pill ${s.accent}`} />
          <div>
            <p className="font-heading-bold text-heading font-bold text-ink">{s.name}</p>
            <p className="text-secondary text-ink-soft">{s.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const WHY: { title: string; body: React.ReactNode; accent: string }[] = [
  {
    title: 'Learning happens when it’s active',
    body: (
      <>
        It’s easy to <em>feel</em> like we’re learning when we consume content. Interacting with
        ideas — and using them in different ways — is what makes them stick and grow.
      </>
    ),
    accent: 'bg-cornflower',
  },
  {
    title: 'Motivation is more than gamification',
    body: 'Genuine progress, the right amount of challenge, relevance to your life, and reflecting on your learning — no streaks or points required.',
    accent: 'bg-leaf',
  },
  {
    title: 'The science of learning has found a lot',
    body: 'Research says a great deal about how people learn across domains. thinkering draws on a library of science-of-learning activities and applies them where they help.',
    accent: 'bg-sun',
  },
  {
    title: 'Learning is not linear',
    body: 'You shouldn’t be stuck in a path that isn’t working, or doesn’t match what you need right now. Your learning app should adjust to your needs and allow you to go off-path and explore.',
    accent: 'bg-peach',
  },
]

function WhyItWorks() {
  return (
    <section id="why-it-works" className="scroll-mt-16 bg-cornflower-tint">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-ink">Why it works</h2>
        <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {WHY.map((item) => (
            <div key={item.title}>
              <span className={`block h-2 w-10 rounded-pill ${item.accent}`} />
              <h3 className="mt-4 font-heading-bold text-title font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-body text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const PRINCIPLES = [
  {
    title: 'User control and choice',
    body: 'Suggestions for ease and inspiration, but you decide what and how you learn.',
  },
  {
    title: 'Built on the science of learning',
    body: 'Research shapes the content and the interactions. We’re continuing to figure out how to build it in accurate, engaging, and effective ways.',
  },
  { title: 'Privacy-centered', body: 'Your learning data stays on your device by default.' },
  {
    title: 'Intentional, transparent AI',
    body: 'AI that grows your capabilities instead of replacing them.',
  },
]

function Principles() {
  return (
    <section id="principles" className="scroll-mt-16 bg-ink">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-white">Principles</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-card bg-surface p-6 shadow-card">
              <h3 className="font-heading-bold text-heading font-bold text-ink">{p.title}</h3>
              <p className="mt-2 text-secondary text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/about"
          className="mt-8 inline-block text-secondary text-cornflower-tint underline-offset-4 hover:underline"
        >
          Read more about the principles
        </Link>
      </div>
    </section>
  )
}

function Project() {
  return (
    <section id="project" className="scroll-mt-16">
      <div className="mx-auto grid max-w-5xl items-start gap-10 px-6 py-20 sm:grid-cols-[3fr_2fr]">
        <div className="max-w-md">
          <h2 className="font-heading-bold text-display-md font-bold text-ink">The project</h2>
          <p className="mt-4 text-body text-ink-soft">
            thinkering is early and actively in development. I&rsquo;d love to hear what
            you&rsquo;re looking for in your personal learning and work together to ensure
            it&rsquo;s accurate, effective, and enjoyable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contribute"
              className="rounded-pill bg-cornflower px-5 py-2.5 font-medium text-white transition-colors hover:bg-cornflower-deep"
            >
              Contribute
            </Link>
            <a
              href={links.featurebase}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill border border-hairline bg-surface px-5 py-2.5 font-medium text-ink transition-colors hover:border-cornflower"
            >
              Feedback &amp; roadmap
            </a>
          </div>
          <p className="mt-6 text-secondary text-ink-soft">
            Or say hello: <EmailLink className="text-cornflower-deep hover:underline" />
          </p>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
          <ul className="flex flex-col gap-4 text-secondary text-ink">
            <li>
              Built by{' '}
              <a
                href={links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cornflower-deep hover:underline"
              >
                Rebecca Hao
              </a>
              , learning designer and software developer
            </li>
            <li>
              With the support of{' '}
              <a
                href={links.assemblyCode}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cornflower-deep hover:underline"
              >
                Assembly Code
              </a>
              , a non-profit incubator and studio
            </li>
            <li>Free to use. Your data is private — local to your device by default.</li>
            <li>
              Open source on{' '}
              <a
                href={links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cornflower-deep hover:underline"
              >
                GitHub
              </a>{' '}
              under AGPL
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
