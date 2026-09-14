# Malformed ActivityDoc corpus

Committed examples of broken model output that must fail `parseActivityDoc` cleanly
and never reach a renderer (docs/10-testing.md, Tier 1). Each file is raw model
output (a string, not necessarily valid JSON). The test in
`src/schemas/activity-doc.test.ts` asserts every file here fails with at least one
useful issue. Goal concept ids assumed by the corpus: `c-tokens`, `c-embeddings`.
