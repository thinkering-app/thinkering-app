import type { Metadata } from 'next'
import { Fragment } from 'react'
import { libraryItemsForSection, type Section } from '@thinkering/core'

import { BetaButton } from '../../../components/beta-button'
import { links } from '../../../components/links'

export const metadata: Metadata = {
  title: 'Approach',
}

export default function Approach() {
  return (
    <>
      <Hero />
      <Swaps />
      <ThreeJobs />
      <LittleAndOften />
      <Domains />
      <InCharge />
      <StillWorkingOut />
      <FurtherReading />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="blob -right-16 top-8 h-72 w-72 bg-leaf-tint" />
      <div className="blob -left-24 top-40 h-56 w-56 bg-cornflower-tint" />
      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 sm:pt-28">
        <p className="text-caption font-medium uppercase tracking-wide text-cornflower-deep">
          Approach
        </p>
        <h1 className="mt-4 max-w-3xl font-heading-bold text-display-lg font-bold text-ink">
          Built on how people learn. Shaped by you.
        </h1>
        <p className="mt-5 max-w-xl text-title text-ink-soft">
          Research has found a lot about what helps people learn. thinkering builds it into short
          daily activities, and leaves what and how you learn up to you.
        </p>
      </div>
    </section>
  )
}

const SWAPS = [
  { from: 'Reading it again', to: 'Recalling it from memory' },
  { from: 'Highlighting', to: 'Explaining it in your own words' },
  { from: 'Watching straight through', to: 'Pausing to answer a question' },
  { from: 'Ten of the same problem', to: 'Mixing a few topics together' },
]

function Swaps() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="max-w-2xl font-heading-bold text-display-md font-bold text-ink">
          Small swaps that make learning stick
        </h2>
        <p className="mt-4 max-w-2xl text-body text-ink-soft">
          The most useful practice often feels harder. That&rsquo;s normal: the effort is what
          builds memory, understanding and skill.
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {SWAPS.map((swap) => (
            <li
              key={swap.to}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-leaf-tint px-5 py-4 text-body"
            >
              <span className="text-ink-soft">{swap.from}</span>
              <span aria-label="becomes" className="text-leaf">
                →
              </span>
              <span className="font-medium text-ink">{swap.to}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-secondary text-ink-soft">
          Researchers call these <em>desirable difficulties</em>: harder in the moment, better in
          the long run.
        </p>
      </div>
    </section>
  )
}

const JOBS: {
  section: Section
  name: string
  job: string
  body: string
  research: string[]
  example: { interest: string; activity: string; prompt: string }
  accent: string
  wash: string
  text: string
}[] = [
  {
    section: 'next',
    name: 'Next',
    job: 'Take in something new',
    body: 'A new idea holds better when it’s linked to something you already know, shown worked through, or figured out before it’s named. Next introduces one goal from your path in a few short, interactive pages.',
    research: ['Prior knowledge', 'Worked examples', 'The generation effect'],
    example: {
      interest: 'German',
      activity: 'Guided Discovery',
      prompt:
        'Here are three sentences that start with “Heute”. Before we name the rule: where did the verb go?',
    },
    accent: 'bg-cornflower',
    wash: 'bg-cornflower-tint',
    text: 'text-cornflower-deep',
  },
  {
    section: 'strengthen',
    name: 'Strengthen',
    job: 'Make it stick',
    body: 'Memory and deeper understanding are built by pulling things back out, not by putting them in again. Strengthen has you recall, explain and practise what you’ve met, with feedback each time, and keeps coming back to it over days and weeks.',
    research: ['Retrieval practice', 'Spacing', 'Interleaving', 'Deliberate practice'],
    example: {
      interest: 'Personal finance',
      activity: 'Mixed Review',
      prompt:
        'From memory: one question on index funds, one on your emergency fund, then back again.',
    },
    accent: 'bg-leaf',
    wash: 'bg-leaf-tint',
    text: 'text-leaf',
  },
  {
    section: 'go_further',
    name: 'Go further',
    job: 'Put it to use',
    body: 'Knowing something and using it are different skills. Go further takes an idea into your own projects, conversations and surroundings, or deeper into its exceptions and connections. It’s there for days you have a little more time.',
    research: [
      'Transfer',
      'Learning by teaching',
      'Refining mental models',
      'Communities of practice',
    ],
    example: {
      interest: 'Drawing',
      activity: 'Put It to Work',
      prompt:
        'Sketch your kitchen table with the two-point perspective from Tuesday. Where are your vanishing points?',
    },
    accent: 'bg-peach',
    wash: 'bg-peach-tint',
    text: 'text-ink-soft',
  },
]

function ThreeJobs() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-ink">
          Every day, three jobs
        </h2>
        <p className="mt-4 max-w-2xl text-body text-ink-soft">
          A day in thinkering has up to three short activities, one for each part of learning
          something. Each is drawn from a library of activity types, and each type is built on a
          specific finding. You choose which types you use, and can add an activity of your own
          whenever you want one.
        </p>
        <div className="mt-12 flex flex-col gap-16">
          {JOBS.map((job) => (
            <Job key={job.section} job={job} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Job({ job }: { job: (typeof JOBS)[number] }) {
  const items = libraryItemsForSection(job.section)
  return (
    <article className="grid items-start gap-6 sm:grid-cols-2 sm:gap-12">
      <div className="max-w-md">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 shrink-0 rounded-pill ${job.accent}`} />
          <p className="font-heading-bold text-heading font-bold text-ink">{job.name}</p>
        </div>
        <h3 className="mt-3 font-heading-bold text-title font-bold text-ink">{job.job}</h3>
        <p className="mt-3 text-body text-ink-soft">{job.body}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="The research">
          {job.research.map((r) => (
            <li
              key={r}
              className="rounded-pill border border-hairline bg-surface px-3 py-1 text-caption text-ink-soft"
            >
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-hairline bg-surface p-5 shadow-card">
          <p className={`text-caption font-medium uppercase tracking-wide ${job.text}`}>
            {job.name} · {job.example.interest}
          </p>
          <p className="mt-2 font-heading text-heading text-ink">{job.example.activity}</p>
          <p className="mt-2 text-secondary text-ink-soft">{job.example.prompt}</p>
        </div>
        <details className={`group rounded-card px-5 py-4 ${job.wash}`}>
          <summary className="cursor-pointer list-none text-secondary font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> All{' '}
            {items.length} {job.name} activities
          </summary>
          <dl className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id}>
                <dt className="text-secondary font-medium text-ink">{item.name}</dt>
                <dd className="text-secondary text-ink-soft">{item.whyItHelps}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </article>
  )
}

const OFTEN = [
  {
    title: 'Old goals come back',
    body: 'Strengthen picks what you’ve met but not yet practised, then whatever you’ve gone longest without seeing.',
  },
  {
    title: 'Topics get mixed',
    body: 'Once you’ve started three goals, Mixed Review switches between them, so you learn which idea fits where.',
  },
  {
    title: 'The path moves with you',
    body: 'It’s a direction, not a syllabus. Reflect on how it’s going, and add, reorder or drop goals as you need.',
  },
]

function LittleAndOften() {
  return (
    <section className="bg-cornflower-tint">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-ink">A little, often</h2>
        <p className="mt-4 max-w-2xl text-body text-ink-soft">
          A few minutes a day beats an hour on Sunday. Spreading practice out means you recall
          things just as they start to fade, and that&rsquo;s what makes them last.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {OFTEN.map((o) => (
            <div key={o.title} className="rounded-card bg-surface p-6 shadow-card">
              <h3 className="font-heading-bold text-heading font-bold text-ink">{o.title}</h3>
              <p className="mt-2 text-secondary text-ink-soft">{o.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-secondary text-ink-soft">
          What shows up each day is decided by simple, predictable rules from your progress. AI
          writes the activities; it doesn&rsquo;t pick them.
        </p>
      </div>
    </section>
  )
}

const DOMAINS = [
  {
    title: 'Languages',
    examples: 'German, Spanish, Japanese',
    body: 'Plenty of reading and listening you can nearly understand, then producing sentences of your own.',
    research: ['Comprehensible input', 'Output practice'],
    accent: 'border-cornflower',
  },
  {
    title: 'Hands-on skills',
    examples: 'Drawing, music, chess',
    body: 'One weak spot at a time, just past what’s comfortable, with feedback on every try. Many quick examples to train your eye, then making something.',
    research: ['Deliberate practice', 'Perceptual learning'],
    accent: 'border-leaf',
  },
  {
    title: 'Technical subjects',
    examples: 'Personal finance, coding, LLMs',
    body: 'Worked examples first, then examples with steps missing, then problems on your own. The support fades as you get more experienced.',
    research: ['Worked examples', 'Fading'],
    accent: 'border-sun',
  },
  {
    title: 'Understanding a field',
    examples: 'History, science, product management',
    body: 'Real cases, side-by-side comparisons, and connecting ideas to each other, so you build a map of the subject rather than a list of facts.',
    research: ['Case-based learning', 'Elaboration'],
    accent: 'border-peach',
  },
]

function Domains() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="max-w-2xl font-heading-bold text-display-md font-bold text-ink">
          Different things, learned differently
        </h2>
        <p className="mt-4 max-w-2xl text-body text-ink-soft">
          Learning a language isn&rsquo;t like learning to draw, or to invest. thinkering leans on
          the methods that fit what you&rsquo;re learning.
        </p>
        <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <section key={d.title} className={`border-l-4 pl-5 ${d.accent}`}>
              <h3 className="font-heading-bold text-title font-bold text-ink">{d.title}</h3>
              <p className="text-secondary text-ink-soft">{d.examples}</p>
              <p className="mt-3 text-body text-ink-soft">{d.body}</p>
              <p className="mt-3 text-caption text-ink-soft">{d.research.join(' · ')}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}

const CONTROLS = [
  {
    title: 'What you learn',
    body: 'Keep a few interests in focus and others just for exploring. Switch them whenever you like.',
  },
  {
    title: 'Where it’s heading',
    body: 'Edit, reorder or add goals on your path, or reflect on how it’s going and rework it.',
  },
  {
    title: 'How you practice',
    body: 'Turn activity types on or off. Figure out how you want to be learning each day.',
  },
  {
    title: 'More of this, less of that',
    body: 'Tell thinkering what you’d like more or less of, in your own words.',
  },
  {
    title: 'Your own activity',
    body: 'Add one whenever you want, with what you’d like to focus on or how you’d like to learn it.',
  },
  {
    title: 'Questions as you go',
    body: 'Ask anything mid-activity, and the answer becomes the next page.',
  },
]

function InCharge() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-start gap-10 sm:grid-cols-[3fr_2fr]">
          <div className="max-w-xl">
            <h2 className="font-heading-bold text-display-md font-bold text-ink">
              You&rsquo;re in charge
            </h2>
            <p className="mt-4 text-body text-ink-soft">
              We learn better when we have real choices about what and how we learn. And knowing
              what works for you is a skill in its own right, one that grows with practice and
              outlasts any one subject.
            </p>
            <p className="mt-3 text-caption text-ink-soft">
              Autonomy and motivation · Self-regulated learning
            </p>
          </div>
          <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
            <span className="block h-2 w-10 rounded-pill bg-sun" />
            <p className="mt-4 font-heading text-heading text-ink">
              What would you like more or less of?
            </p>
            <p className="mt-2 text-secondary text-ink-soft">
              &ldquo;More drills, fewer videos. And I&rsquo;d rather explain things than pick from
              options.&rdquo;
            </p>
          </div>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-3">
          {CONTROLS.map((c) => (
            <li key={c.title} className="rounded-card bg-surface p-6 shadow-card">
              <h3 className="font-heading-bold text-heading font-bold text-ink">{c.title}</h3>
              <p className="mt-2 text-secondary text-ink-soft">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-4 rounded-card border border-dashed border-hairline p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading-bold text-heading font-bold text-ink">Still to come</h3>
            <p className="mt-1 text-secondary text-ink-soft">
              More configuration options for your learning routine.{' '}
              <a
                href={links.featurebaseRoutinePost}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cornflower-deep hover:underline"
              >
                Follow it on the feedback board
              </a>
            </p>
          </div>
          <a
            href={links.featurebase}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-pill border border-hairline bg-surface px-5 py-2.5 text-secondary font-medium text-ink transition-colors hover:border-cornflower"
          >
            Tell us what would help you learn
          </a>
        </div>
      </div>
    </section>
  )
}

const OPEN = [
  {
    title: 'The methods are well tested. thinkering isn’t, yet.',
    body: 'The research is about the techniques. How to ensure this app applies them well and in the right context is what the beta and ongoing development are for.',
  },
  {
    title: 'What keeps you coming back',
    body: 'We care more about real progress, the right amount of challenge and relevance to your life than points or streaks. We haven’t settled what else helps, and we’re listening.',
  },
  {
    title: 'Suggesting, or letting you decide',
    body: 'Good defaults make it easy to start; choices make it yours. We’re still finding the balance, and it will keep shifting as we learn what helps.',
  },
  {
    title: 'AI can get things wrong',
    body: 'Activities are written for you by AI, and it can make mistakes. We’re working on accuracy checks. If something looks off, the feedback button is on every screen.',
  },
]

function StillWorkingOut() {
  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-heading-bold text-display-md font-bold text-white">
          What we&rsquo;re still working out
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {OPEN.map((o) => (
            <div key={o.title} className="rounded-card bg-surface p-6 shadow-card">
              <h3 className="font-heading-bold text-heading font-bold text-ink">{o.title}</h3>
              <p className="mt-2 text-secondary text-ink-soft">{o.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const READING: { links: { label: string; href: string }[]; what: string }[] = [
  {
    links: [
      {
        label: 'Spacing and retrieval practice',
        href: 'https://www.nature.com/articles/s44159-022-00089-1',
      },
    ],
    what: 'Why recalling beats rereading, and spreading it out beats cramming.',
  },
  {
    links: [
      {
        label: 'Evidence-based learning strategies',
        href: 'https://doi.org/10.1177/1529100612453266',
      },
    ],
    what: 'Dunlosky and colleagues rate ten common study techniques across subjects and ages, and find which ones hold up.',
  },
  {
    links: [
      { label: 'Deliberate practice', href: 'https://doi.org/10.1037/0033-295X.100.3.363' },
      { label: 'feedback', href: 'https://doi.org/10.3102/003465430298487' },
    ],
    what: 'Ericsson on focused practice on a weak spot, and Hattie and Timperley on the feedback that makes it work.',
  },
  {
    links: [{ label: 'Perceptual learning', href: 'https://doi.org/10.1016/j.plrev.2008.12.001' }],
    what: 'Kellman and Garrigan on how many quick, checked judgments build an expert’s eye.',
  },
  {
    links: [{ label: 'Questions in videos', href: 'https://doi.org/10.1073/pnas.1221764110' }],
    what: 'Why stopping for short quizzes keeps attention on the lecture and improves learning.',
  },
  {
    links: [
      {
        label: 'Designing instructional video',
        href: 'https://www.sciencedirect.com/science/article/abs/pii/S2211368121000231',
      },
    ],
    what: 'What makes a video easier to learn from.',
  },
  {
    links: [
      { label: 'Autonomy and motivation', href: 'https://doi.org/10.1037/0003-066X.55.1.68' },
    ],
    what: 'Ryan and Deci on how choice, growing competence and connection keep people motivated.',
  },
  {
    links: [
      { label: 'Self-regulated learning', href: 'https://doi.org/10.1207/s15430421tip4102_2' },
    ],
    what: 'Zimmerman on how learners plan, monitor and adjust their own learning.',
  },
  {
    links: [{ label: 'Language acquisition', href: 'https://doi.org/10.2167/illt039.0' }],
    what: 'Nation on balancing understandable input, speaking and writing, focused language study, and fluency practice.',
  },
]

function FurtherReading() {
  return (
    <section>
      <div className="mx-auto grid max-w-5xl items-start gap-10 px-6 py-20 sm:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="font-heading-bold text-display-md font-bold text-ink">Further reading</h2>
          <ul className="mt-8 flex flex-col gap-5">
            {READING.map((r) => (
              <li key={r.what}>
                <p className="font-medium text-body text-ink">
                  {r.links.map((link, i) => (
                    <Fragment key={link.href}>
                      {i > 0 && ' and '}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cornflower-deep hover:underline"
                      >
                        {link.label}
                      </a>
                    </Fragment>
                  ))}
                </p>
                <p className="text-secondary text-ink-soft">{r.what}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-leaf-tint p-6">
          <h3 className="font-heading-bold text-title font-bold text-ink">Help shape it</h3>
          <p className="mt-2 text-body text-ink-soft">
            Try it for something you&rsquo;ve been meaning to learn, or help build the library of
            activities with us.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <BetaButton className="rounded-pill bg-cornflower px-5 py-2.5 font-medium text-white transition-colors hover:bg-cornflower-deep" />
            <a
              href={links.featurebaseLibraryThread}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill border border-hairline bg-surface px-5 py-2.5 font-medium text-ink transition-colors hover:border-cornflower"
            >
              Library discussion
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
