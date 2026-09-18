import { expect, test } from './fixtures/persistent-context'

test('fresh browser starts, writes local data, and keeps it', async ({ page, browserErrors }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/intake\/welcome$/)
  await expect(page.getByText('Pick something you want to learn.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true)

  // Restore is the smallest deterministic path through the real browser file
  // picker and the same import transaction users rely on. It proves SQLite can
  // write after its worker and WASM module finish initializing.
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Restore from a backup' }).click()
  await (await fileChooser).setFiles('e2e/fixtures/web-smoke-backup.json')

  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('This interest has no goals yet.')).toBeVisible()

  // Re-enter through the root route. The persisted Interest must now send this
  // browser to Today instead of treating it as a fresh install again.
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('This interest has no goals yet.')).toBeVisible()

  expect(browserErrors).toEqual([])
})
