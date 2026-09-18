import { expect, test } from './fixtures/persistent-context'

import backup from './fixtures/web-smoke-backup.json'

const BACKUP = 'e2e/fixtures/web-smoke-backup.json'

/**
 * expo-sqlite's web worker hands a synchronous result back through a shared
 * buffer whose first four bytes are the payload length, and it wrote that
 * length one byte wide — anything from 256 bytes up came back truncated and
 * failed to parse (patched in `patches/expo-sqlite@57.0.3.patch`). Only a row
 * big enough to cross that line exercises the fix.
 */
test('the fixture interest is large enough to cross a sync result boundary', () => {
  expect(backup.tables.interests[0].approachNotes.length).toBeGreaterThan(256)
})

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
  await (await fileChooser).setFiles(BACKUP)

  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('This interest has no goals yet.')).toBeVisible()

  // One interest is the ordinary case, and the selector stays put for it: its
  // pill plus the + that starts intake for the next one (docs/01 §2).
  await expect(page.getByRole('button', { name: 'Web persistence' })).toBeVisible()
  await page.getByRole('button', { name: 'Add an interest' }).click()
  await expect(page).toHaveURL(/\/intake\/learn$/)
  await expect(page.getByText('What do you want to learn?')).toBeVisible()

  // Re-enter through the root route. The persisted Interest must now send this
  // browser to Today instead of treating it as a fresh install again.
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('This interest has no goals yet.')).toBeVisible()

  expect(browserErrors).toEqual([])
})
