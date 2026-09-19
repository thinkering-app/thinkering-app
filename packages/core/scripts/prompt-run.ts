/**
 * `pnpm prompt:run <kind> [--only <fixture>] [--record]` — run a kind live
 * against its input fixture(s), or just one, for manual iteration (docs/04, docs/10 Tier 5). Streams to stderr,
 * validates against the kind's output schema, prints a summary. `--record`
 * saves the response into fixtures/recorded/<kind>/ for fixture AI mode and
 * tests — re-record deliberately; the diff is the review.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadFixtures, parseScriptArgs, pkgRoot, requireTemplate, runLive } from './prompt-lib'
import { extractJsonText } from '../src/streaming/json'

const { kind, only, record } = parseScriptArgs(process.argv.slice(2))
const template = requireTemplate(kind)

for (const fixture of loadFixtures(template.kind, only)) {
  console.error(`\n── ${template.kind} · ${fixture.name} · model=${template.model} v${template.version} ──`)
  const result = await runLive(template, fixture.params)

  let outputOk = false
  try {
    const parsed = template.outputSchema.safeParse(JSON.parse(extractJsonText(result.text)))
    outputOk = parsed.success
    if (!parsed.success) console.error('schema issues:', parsed.error.issues.slice(0, 10))
  } catch (e) {
    console.error('output is not valid JSON:', (e as Error).message)
  }

  console.log(
    `${fixture.name}: ${outputOk ? 'valid' : 'INVALID'} · in=${result.usage.inputTokens} (cache r=${result.usage.cacheReadTokens} w=${result.usage.cacheWriteTokens}) out=${result.usage.outputTokens} · ${result.latencyMs}ms`,
  )

  if (record) {
    const dir = join(pkgRoot, 'fixtures/recorded', template.kind)
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${fixture.name}.json`)
    writeFileSync(
      file,
      JSON.stringify(
        {
          kind: template.kind,
          promptVersion: template.version,
          model: result.model,
          fixture: fixture.name,
          text: result.text,
          usage: result.usage,
          latencyMs: result.latencyMs,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(`recorded → ${file}`)
  }
}
