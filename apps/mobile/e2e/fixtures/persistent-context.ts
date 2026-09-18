import { test as base, type BrowserContext, type Page } from '@playwright/test'

/**
 * OPFS — where the web build keeps its SQLite file — needs a browsing context
 * with real storage behind it. Playwright's default context is ephemeral, and
 * WebKit refuses OPFS outright in one, so anything that touches the database
 * has to run against a profile on disk. The profile lives in the test's own
 * output directory, which the runner creates and clears between runs.
 */
export const test = base.extend<{ context: BrowserContext }>({
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
