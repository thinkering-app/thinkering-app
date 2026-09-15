/**
 * `pnpm prompt:check <kind>` — live structural + tone assertions on a kind's
 * fixture inputs (docs/10 Tier 5): schema-valid, kind-specific structure
 * (page counts, review placement, concept resolution), tone lints. Never
 * string equality; quality judgment stays human (AI Inspector).
 */
import { parseActivityDoc } from '../src/schemas/activity-doc'
import { checkActivityDoc, toneLintOutput, type CheckIssue } from '../src/prompts/checks'
import type { ActivityGenerateParams } from '../src/prompts/kinds/activity-generate'
import { loadFixtures, requireTemplate, runLive } from './prompt-lib'
import { extractJsonText } from '../src/streaming/json'

const kind = process.argv.slice(2).find((a) => !a.startsWith('--'))
const template = requireTemplate(kind)

let failures = 0

for (const fixture of loadFixtures(template.kind)) {
  console.error(`\n── check ${template.kind} · ${fixture.name} ──`)
  const result = await runLive(template, fixture.params)
  const issues: CheckIssue[] = []

  let output: unknown
  try {
    output = JSON.parse(extractJsonText(result.text))
  } catch (e) {
    issues.push({ check: 'json', message: `not valid JSON: ${(e as Error).message}` })
  }

  if (output !== undefined) {
    if (template.kind === 'activity.generate') {
      const params = template.paramsSchema.parse(fixture.params) as ActivityGenerateParams
      const goalConceptIds = params.goal.concepts.map((c) => c.id)
      const parsed = parseActivityDoc(output, { goalConceptIds })
      if (!parsed.ok) {
        issues.push(...parsed.issues.map((i) => ({ check: 'schema', message: `${i.path}: ${i.message}` })))
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
      } else {
        issues.push(...toneLintOutput(parsed.data, fixture.name))
      }
    }
  }

  if (issues.length === 0) {
    console.log(`${fixture.name}: PASS (${result.usage.outputTokens} out tokens, ${result.latencyMs}ms)`)
  } else {
    failures++
    console.log(`${fixture.name}: FAIL`)
    for (const issue of issues) console.log(`  [${issue.check}] ${issue.message}`)
  }
}

process.exit(failures > 0 ? 1 : 0)
