/**
 * `pnpm prompt:check <kind> [--only <fixture>]` — live structural + tone
 * assertions on a kind's fixture inputs (docs/10 Tier 5): schema-valid,
 * kind-specific structure (page counts, review placement, concept resolution,
 * the length budgets for the review and summary pages), tone lints. Never
 * string equality; quality judgment stays human (AI Inspector).
 */
import { weightedTokens } from '../src/domain'
import { parseActivityDoc } from '../src/schemas/activity-doc'
import type { Block } from '../src/schemas/blocks'
import {
  checkActivityDoc,
  checkResources,
  checkReviewBlocks,
  toneLintOutput,
  type CheckIssue,
} from '../src/prompts/checks'
import type { ActivityGenerateParams } from '../src/prompts/kinds/activity-generate'
import type { ResourcesSearchParams } from '../src/prompts/kinds/resources-search'
import { loadFixtures, parseScriptArgs, requireTemplate, runLive } from './prompt-lib'
import { extractJsonText } from '../src/streaming/json'

const { kind, only } = parseScriptArgs(process.argv.slice(2))
const template = requireTemplate(kind)

let failures = 0

for (const fixture of loadFixtures(template.kind, only)) {
  console.error(`\n── check ${template.kind} · ${fixture.name} ──`)
  const result = await runLive(template, fixture.params)
  const issues: CheckIssue[] = []

  let output: unknown
  if (result.stopped) {
    issues.push({ check: 'stopped', message: result.stopped })
  } else {
    try {
      output = JSON.parse(extractJsonText(result.text))
    } catch (e) {
      issues.push({ check: 'json', message: `not valid JSON: ${(e as Error).message}` })
    }
  }

  if (output !== undefined) {
    if (template.kind === 'activity.generate') {
      const params = template.paramsSchema.parse(fixture.params) as ActivityGenerateParams
      const goalConceptIds = params.goal.concepts.map((c) => c.id)
      const parsed = parseActivityDoc(output, { goalConceptIds })
      if (!parsed.ok) {
        issues.push(
          ...parsed.issues.map((i) => ({ check: 'schema', message: `${i.path}: ${i.message}` })),
        )
      } else {
        issues.push(
          ...checkActivityDoc(parsed.doc, {
            estMinutes: params.estMinutes,
            goalConceptIds,
            libraryItemId: params.libraryItemId,
          }),
        )
      }
    } else {
      const parsed = template.outputSchema.safeParse(output)
      if (!parsed.success) {
        issues.push(
          ...parsed.error.issues.slice(0, 10).map((i) => ({
            check: 'schema',
            message: `${i.path.join('.')}: ${i.message}`,
          })),
        )
      } else if (template.kind === 'resources.search' || template.kind === 'resources.more') {
        // Same output shape, different briefs: G4 seeds the pair early
        // activities need, G12 ranges wider because the learner asked.
        const params = template.paramsSchema.parse(fixture.params) as ResourcesSearchParams
        const seeding = template.kind === 'resources.search'
        issues.push(
          ...checkResources(parsed.data as never, {
            goalTitles: params.goalTitles,
            count: seeding ? { min: 2, max: 2 } : { min: 2, max: 4 },
            mediaSplit: seeding,
            excludeUrls: params.excludeUrls,
          }),
        )
      } else if (template.kind === 'activity.review') {
        issues.push(...checkReviewBlocks((parsed.data as { blocks: Block[] }).blocks, fixture.name))
      } else {
        issues.push(...toneLintOutput(parsed.data, fixture.name))
      }
    }
  }

  // Weighted tokens are the unit the daily budget is measured in (docs/04
  // §Usage metering), so a run here is comparable to the AI Inspector's totals
  // — and a kind being tuned for cost can be read off directly. Reported on a
  // failure too: a change that fixes the output by doubling the spend has not
  // made things better.
  const { inputTokens, outputTokens, cacheReadTokens } = result.usage
  const usage =
    `in ${inputTokens} (${cacheReadTokens} cached) / out ${outputTokens} · ` +
    `${weightedTokens(inputTokens, outputTokens)} weighted · ${result.latencyMs}ms`

  if (issues.length === 0) {
    console.log(`${fixture.name}: PASS (${usage})`)
  } else {
    failures++
    console.log(`${fixture.name}: FAIL (${usage})`)
    for (const issue of issues) console.log(`  [${issue.check}] ${issue.message}`)
  }
}

process.exit(failures > 0 ? 1 : 0)
