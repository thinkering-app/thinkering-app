import { test as base, type BrowserContext, type Page, type TestInfo } from '@playwright/test'

/**
 * OPFS — where the web build keeps its SQLite file — needs a browsing context
 * with real storage behind it. Playwright's default context is ephemeral, and
 * WebKit refuses OPFS outright in one, so anything that touches the database
 * has to run against a profile on disk. The profile lives in the test's own
 * output directory, which the runner creates and clears between runs.
 */
export const test = base.extend<{ context: BrowserContext; browserErrors: string[] }>({
  context: async ({ playwright, browserName, baseURL }, provide, testInfo) => {
    const { channel, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
      testInfo.project.use
    const context = await playwright[browserName].launchPersistentContext(
      testInfo.outputPath('browser-profile'),
      { baseURL, channel, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch },
    )
    await provide(context)
    await context.close()
  },
  /** Everything the page complained about; ask for it to assert it stayed quiet. */
  // eslint-disable-next-line no-empty-pattern
  browserErrors: async ({}, provide) => {
    await provide([])
  },
  page: async ({ context, browserErrors }, provide, testInfo) => {
    const page = context.pages()[0] ?? (await context.newPage())
    await emptyOriginPrivateFileSystem(page)
    // Only from here: the wipe deliberately loads a page that isn't there, and
    // its 404 is not something the app under test did.
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
    })

    await provide(page)

    await reportSyncWaits(page, testInfo)

    if (testInfo.status !== testInfo.expectedStatus) {
      await reportPage(page, browserErrors, testInfo)
    }
  },
})

/**
 * These runs happen on engines and machines nobody is sitting in front of, and
 * a failure that won't reproduce anywhere else is only as debuggable as what
 * the run wrote down. A timed-out assertion names the locator it wanted; this
 * names what was on the screen instead.
 */
async function reportPage(page: Page, errors: string[], testInfo: TestInfo): Promise<void> {
  const rendered = await page
    .locator('body')
    .innerText()
    .catch((error: unknown) => `unavailable: ${String(error)}`)
  const report = [
    `url: ${page.url()}`,
    `browser errors:\n${errors.join('\n') || '(none)'}`,
    `rendered text:\n${rendered}`,
  ].join('\n\n')
  // Both, deliberately: the attachment travels with the trace for anyone who
  // downloads it, and the log is all a run whose artifacts have expired leaves.
  await testInfo.attach('page-at-failure', { body: report, contentType: 'text/plain' })
  console.log(`\n--- page at failure: ${testInfo.title} ---\n${report}\n---\n`)
}

/** TEMPORARY: how long the sync SQLite bridge spun, so the timeout can be a measured number. */
async function reportSyncWaits(page: Page, testInfo: TestInfo): Promise<void> {
  const waits = await page
    .evaluate(() => (globalThis as unknown as { __syncWaits?: number[] }).__syncWaits ?? [])
    .catch(() => [] as number[])
  if (waits.length === 0) {
    console.log(`SYNCWAIT ${testInfo.project.name} "${testInfo.title}": none recorded`)
    return
  }
  const sorted = [...waits].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!
  const ms = (n: number) => n.toFixed(2)
  console.log(
    `SYNCWAIT ${testInfo.project.name} "${testInfo.title}": n=${sorted.length} ` +
      `p50=${ms(at(0.5))} p95=${ms(at(0.95))} p99=${ms(at(0.99))} max=${ms(sorted.at(-1)!)} ` +
      `top5=[${sorted.slice(-5).map(ms).join(', ')}]`,
  )
}

/**
 * WebKit keeps OPFS outside the profile directory, so yesterday's database is
 * still there in a profile the runner considers brand new. Wipe it from a page
 * on the origin that isn't the app — nothing holds the files open there, which
 * is the only moment they can be removed.
 */
async function emptyOriginPrivateFileSystem(page: Page): Promise<void> {
  await page.goto('/e2e-blank')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for await (const name of root.keys()) await root.removeEntry(name, { recursive: true })
  })
}

export { expect } from '@playwright/test'
