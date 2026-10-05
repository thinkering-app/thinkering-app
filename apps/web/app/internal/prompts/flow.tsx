import { PROMPTS, type ImplementedKind } from '@thinkering/core'

/**
 * The order the kinds are called in and what each one hands the next, drawn
 * as a hub: intake fills the interest, and everything after it reads the
 * interest back as the learner context block and writes to it. Direct
 * hand-offs — one call's output in the next call's params — are the arrows
 * within a lane; everything else travels through the interest.
 *
 * Kept by hand against docs/04 §Generation map. A `Record` over every kind, so
 * a new kind doesn't typecheck until it has a place here.
 */

type Lane = 'intake' | 'day' | 'reflect' | 'onDemand'

/** What the interest holds that the context block carries back into prompts. */
type Stored = 'approach notes' | 'outcomes' | 'goals' | 'resources' | 'routine notes' | 'history'

interface Step {
  lane: Lane
  trigger: string
  /** Direct hand-offs: which earlier kind's output is in this kind's params. */
  from?: { kind: ImplementedKind; carries: string }[]
  /** What it leaves on the interest, once the learner keeps it. */
  writes?: Stored[]
}

const STEPS: Record<ImplementedKind, Step> = {
  'intake.approach': { lane: 'intake', trigger: 'Intake step 2 → 3', writes: ['approach notes'] },
  'intake.outcomes': {
    lane: 'intake',
    trigger: 'Step 3 → 4',
    from: [{ kind: 'intake.approach', carries: 'domain notes' }],
    writes: ['outcomes'],
  },
  'intake.topicOptions': {
    lane: 'intake',
    trigger: 'Step 3 → 4',
    from: [{ kind: 'intake.approach', carries: 'domain notes' }],
  },
  'intake.path': {
    lane: 'intake',
    trigger: 'Step 5 → 6',
    from: [
      { kind: 'intake.approach', carries: 'domain notes, pitfalls' },
      { kind: 'intake.outcomes', carries: 'picked outcomes' },
      { kind: 'intake.topicOptions', carries: 'picked topics' },
    ],
    writes: ['goals'],
  },
  'resources.search': {
    lane: 'intake',
    trigger: 'Intake done · native only',
    from: [{ kind: 'intake.path', carries: 'goal titles' }],
    writes: ['resources'],
  },
  'today.plan': { lane: 'day', trigger: 'App open on a new day' },
  'activity.generate': {
    lane: 'day',
    trigger: 'Next ahead · others on Write',
    from: [{ kind: 'today.plan', carries: 'title, library item, minutes' }],
    writes: ['history'],
  },
  'activity.review': {
    lane: 'day',
    trigger: 'Last interactive page done',
    from: [{ kind: 'activity.generate', carries: 'their responses' }],
  },
  'activity.question': {
    lane: 'day',
    trigger: 'Ask',
    from: [{ kind: 'activity.generate', carries: 'the page they’re on' }],
  },
  'reflect.open': { lane: 'reflect', trigger: 'Reflection opens', writes: ['outcomes'] },
  'reflect.update': {
    lane: 'reflect',
    trigger: 'Reflection submit',
    from: [{ kind: 'reflect.open', carries: 'outcomes they kept' }],
    writes: ['goals'],
  },
  'path.suggestGoals': { lane: 'onDemand', trigger: 'Path opened', writes: ['goals'] },
  'resource.describe': { lane: 'onDemand', trigger: 'Add a link', writes: ['resources'] },
  'resources.more': {
    lane: 'onDemand',
    trigger: 'Find more · off for beta',
    writes: ['resources'],
  },
  'routine.customize': { lane: 'onDemand', trigger: 'Routine request', writes: ['routine notes'] },
}

const LANES: { lane: Lane; label: string; lead?: { title: string; note: string } }[] = [
  {
    lane: 'day',
    label: 'Every day',
    lead: { title: 'Scheduler', note: 'Plain code: picks the goals' },
  },
  { lane: 'reflect', label: 'Reflection' },
  { lane: 'onDemand', label: 'On demand' },
]

const STORED: Stored[] = [
  'approach notes',
  'outcomes',
  'goals',
  'resources',
  'routine notes',
  'history',
]

const KINDS = Object.keys(STEPS) as ImplementedKind[]

/**
 * A lane's kinds grouped into columns by how many hand-offs precede them in
 * that lane, so parallel kinds (review and question) stack in one column. A
 * lane with no hand-offs at all is laid out as a row of unrelated calls.
 */
function stagesOf(lane: Lane): ImplementedKind[][] {
  const depth = (kind: ImplementedKind): number => {
    const inLane = (STEPS[kind].from ?? []).filter((f) => STEPS[f.kind].lane === lane)
    return inLane.length === 0 ? 0 : 1 + Math.max(...inLane.map((f) => depth(f.kind)))
  }
  const stages: ImplementedKind[][] = []
  for (const kind of KINDS.filter((k) => STEPS[k].lane === lane)) {
    ;(stages[depth(kind)] ??= []).push(kind)
  }
  return stages
}

const tag = 'rounded-pill px-2 py-0.5 text-caption'

function Card({ kind, readsContext }: { kind: ImplementedKind; readsContext: boolean }) {
  const step = STEPS[kind]
  return (
    <div className="w-44 shrink-0 rounded-card border border-hairline bg-surface p-3">
      <a
        href={`#${kind}`}
        className="font-medium text-secondary text-cornflower-deep hover:underline"
      >
        {kind}
      </a>
      <p className="text-caption text-ink-soft">
        {step.trigger} · {PROMPTS[kind].model}
      </p>
      {step.from?.map((f) => (
        <p key={f.kind} className="mt-1.5 text-caption text-ink-soft">
          ← <span className="text-ink">{f.kind}</span>: {f.carries}
        </p>
      ))}
      {readsContext || step.writes ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {readsContext ? (
            <span className={`${tag} bg-cornflower-tint text-cornflower-deep`}>reads context</span>
          ) : null}
          {step.writes?.map((field) => (
            <span key={field} className={`${tag} bg-leaf-tint text-ink`}>
              writes {field}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Arrow() {
  return (
    <span aria-hidden className="shrink-0 self-center px-1 text-heading text-ink-soft">
      →
    </span>
  )
}

function LaneRow({
  lane,
  lead,
  readsContext,
}: {
  lane: Lane
  lead?: { title: string; note: string }
  readsContext: ReadonlySet<ImplementedKind>
}) {
  const stages = stagesOf(lane)
  if (stages.length === 1 && !lead) {
    return (
      <div className="flex max-w-[46rem] flex-wrap gap-2">
        {stages[0]!.map((kind) => (
          <Card key={kind} kind={kind} readsContext={readsContext.has(kind)} />
        ))}
      </div>
    )
  }
  return (
    <div className="flex items-stretch">
      {lead ? (
        <>
          <div className="w-32 shrink-0 self-center rounded-card border border-dashed border-hairline p-3">
            <p className="font-medium text-secondary text-ink">{lead.title}</p>
            <p className="text-caption text-ink-soft">{lead.note}</p>
          </div>
          <Arrow />
        </>
      ) : null}
      {stages.map((stage, index) => (
        <div key={index} className="flex items-stretch">
          {index > 0 ? <Arrow /> : null}
          <div className="flex flex-col justify-center gap-2">
            {stage.map((kind) => (
              <Card key={kind} kind={kind} readsContext={readsContext.has(kind)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const laneLabel = 'w-20 shrink-0 pt-3 text-caption font-medium text-ink'

export function PromptFlow({ readsContext }: { readsContext: ReadonlySet<ImplementedKind> }) {
  const writers = (field: Stored) => KINDS.filter((kind) => STEPS[kind].writes?.includes(field))
  return (
    <details open className="mt-8 rounded-card border border-hairline bg-surface p-6">
      <summary className="cursor-pointer font-heading text-heading text-ink">
        How the calls connect
      </summary>
      <p className="mt-2 max-w-2xl text-secondary text-ink-soft">
        Arrows are direct hand-offs, one call’s output in the next call’s params. Everything else
        goes through the interest: what a call writes there, the calls that read context get back.
      </p>

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-max flex-col gap-4">
          <div className="flex gap-3">
            <p className={laneLabel}>Intake, once</p>
            <LaneRow lane="intake" readsContext={readsContext} />
          </div>

          <div className="ml-[5.75rem] flex max-w-[45rem] flex-col items-start gap-1">
            <span aria-hidden className="pl-6 text-heading text-ink-soft">
              ↓
            </span>
            <div className="rounded-card border border-cornflower bg-cornflower-tint px-4 py-3">
              <p className="font-medium text-secondary text-ink">
                The interest{' '}
                <span className="font-normal text-ink-soft">
                  — local SQLite, read back as the learner context block
                </span>
              </p>
              <p className="mt-2 text-caption text-ink-soft">Written by</p>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-caption">
                {STORED.map((field) => (
                  <div key={field} className="contents">
                    <dt className="text-ink">{field}</dt>
                    <dd className="text-ink-soft">{writers(field).join(' · ')}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-caption text-ink-soft">
                <span className="text-ink">Read as context by</span>{' '}
                {KINDS.filter((kind) => readsContext.has(kind)).join(' · ')}
              </p>
            </div>
            <span aria-hidden className="pl-6 text-heading text-ink-soft">
              ↕
            </span>
          </div>

          {LANES.map(({ lane, label, lead }) => (
            <div key={lane} className="flex gap-3">
              <p className={laneLabel}>{label}</p>
              <LaneRow lane={lane} lead={lead} readsContext={readsContext} />
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
