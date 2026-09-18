import { expect, test } from './fixtures/persistent-context'

/**
 * The root route only leaves `/` once it has read the database, so landing on
 * either destination is the assertion that matters here. WebKit shares OPFS
 * between profiles, so a spec that ran earlier may already have put an Interest
 * in it — which of the two we get is not this test's business.
 */
const OPENED_THE_DATABASE = /\/(intake\/welcome|today)$/

/** What the page did with the blob URLs it started workers from. */
type WorkerProbe = { startedFromBlob: string[]; revokedBeforeLoad: string[] }

declare global {
  interface Window {
    __workerProbe?: WorkerProbe
  }
}

/**
 * Runs before the app's own scripts and records the order two browser calls
 * happened in. Wrapping the constructor rather than replacing it keeps
 * `instanceof` and the prototype the page would otherwise get.
 */
function recordWorkerBlobUrls(): void {
  const probe: WorkerProbe = { startedFromBlob: [], revokedBeforeLoad: [] }
  window.__workerProbe = probe

  const loaded = new Set<string>()
  const revokeObjectURL = URL.revokeObjectURL.bind(URL)
  URL.revokeObjectURL = (url: string) => {
    if (probe.startedFromBlob.includes(url) && !loaded.has(url)) probe.revokedBeforeLoad.push(url)
    revokeObjectURL(url)
  }

  window.Worker = new Proxy(Worker, {
    construct(target, args: ConstructorParameters<typeof Worker>) {
      const worker = Reflect.construct(target, args)
      const url = String(args[0])
      if (url.startsWith('blob:')) {
        probe.startedFromBlob.push(url)
        // A message is the only proof the page gets that the worker's script
        // was fetched and ran; nothing else about the load is observable.
        worker.addEventListener('message', () => loaded.add(url), { once: true })
      }
      return worker
    },
  })
}

/**
 * Cross-origin isolation is what buys the web build SharedArrayBuffer and OPFS,
 * and it also makes Metro start the SQLite worker from a blob URL. Whether that
 * worker survives the URL being revoked is the engines' business: Chromium
 * keeps the script it was handed, WebKit goes back for it and finds nothing —
 * the worker never loads, the database never opens, and the app sits on a blank
 * screen forever. Localhost is fast enough to hide the gap most of the time, so
 * instead of trying to lose the race on purpose this asserts the order that
 * makes the race unwinnable: the blob URL has to outlive the worker's first
 * sign of life, on both engines.
 */
test('the SQLite worker outlives the blob URL it was started from', async ({ page }) => {
  await page.addInitScript(recordWorkerBlobUrls)

  await page.goto('/')

  await expect(page).toHaveURL(OPENED_THE_DATABASE)
  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true)

  const probe = await page.evaluate(() => window.__workerProbe)
  // An isolated page reaching the database has been through the blob path. If
  // it hasn't, the rest proves nothing and the headers are what to look at.
  expect(probe?.startedFromBlob).not.toHaveLength(0)
  expect(probe?.revokedBeforeLoad).toEqual([])
})

/**
 * OPFS hands the database file to one browsing context at a time, so a second
 * tab cannot open it. That is a state the person can fix, so it gets its own
 * copy — and clears itself once the first tab goes away.
 */
test('a second tab points back at the first one', async ({ context, page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(OPENED_THE_DATABASE)

  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByText('thinkering is open in another tab.')).toBeVisible()

  await page.close()
  await second.getByRole('button', { name: 'Try again' }).click()
  await expect(second).toHaveURL(OPENED_THE_DATABASE)
})
