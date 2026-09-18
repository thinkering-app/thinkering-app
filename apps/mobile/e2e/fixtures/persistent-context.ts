import { test as base, type BrowserContext, type Page } from '@playwright/test'

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
  page: async ({ context }, provide) => {
    const page = context.pages()[0] ?? (await context.newPage())
    await emptyOriginPrivateFileSystem(page)
    await provide(page)
  },
  /**
   * Everything the page complained about, and — when the test failed — what it
   * was showing while it complained. These runs happen on engines and machines
   * nobody is sitting in front of, and a failure that won't reproduce anywhere
   * else is only as debuggable as what the run wrote down. Always on, so a spec
   * gets this without asking; ask for it by name to assert the page stayed
   * quiet.
   */
  browserErrors: [
    async ({ page }, provide, testInfo) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`)
      })

      await provide(errors)

      if (testInfo.status === testInfo.expectedStatus) return
      const rendered = await page
        .locator('body')
        .innerText()
        .catch((error: unknown) => `unavailable: ${String(error)}`)
      const report = [
        `url: ${page.url()}`,
        `browser errors:\n${errors.join('\n') || '(none)'}`,
        `rendered text:\n${rendered}`,
      ].join('\n\n')
      // Both, deliberately: the attachment travels with the trace for anyone
      // who downloads it, and the log is all you get from a CI run whose
      // artifacts have expired.
      await testInfo.attach('page-at-failure', { body: report, contentType: 'text/plain' })
      console.log(`\n--- page at failure: ${testInfo.title} ---\n${report}\n---\n`)
    },
    { auto: true },
  ],
})

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
