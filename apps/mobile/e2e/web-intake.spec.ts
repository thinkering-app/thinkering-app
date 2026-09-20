import { expect, test } from './fixtures/persistent-context'

test('intake finishes into today', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('intake-start').click()
  await page.getByTestId('intake-learn').last().fill('Conversational German')
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-why-fun').last().click()
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-experience-getting_started').last().click()
  await page.getByTestId('intake-continue').last().click()
  await expect(page).toHaveURL(/\/intake\/topics$/)
  await page.getByTestId('intake-continue').last().click({ timeout: 30000 })
  await expect(page).toHaveURL(/\/intake\/success$/)
  await page.getByTestId('intake-continue').last().click({ timeout: 30000 })
  await page.getByTestId('intake-frequency-daily').last().click()
  await page.getByTestId('intake-minutes-10').last().click()
  await page.getByTestId('intake-continue').last().click()
  await expect(page).toHaveURL(/\/intake\/direction$/)
  const finish = page.getByTestId('intake-finish').last()
  await expect(finish).toBeEnabled({ timeout: 45000 })
  await finish.click()

  await expect(page).toHaveURL(/\/today$/)

  // A card from the new path opens: its document is generated on the spot,
  // unlike the seeded interest's, which arrive already written.
  await page.getByTestId('activity-card-next-0').click()
  await expect(page.getByTestId('player-continue')).toBeEnabled({ timeout: 30000 })
  await page.getByLabel('Close').click()
  await expect(page).toHaveURL(/\/today$/)

  // Reload proves the write landed and the router sends a returning user to Today.
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
})

test('a reload partway through intake picks up where it was', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('intake-start').click()
  await page.getByTestId('intake-learn').last().fill('Conversational German')
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-why-fun').last().click()
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-experience-getting_started').last().click()
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-continue').last().click({ timeout: 30000 })
  await page.getByTestId('intake-continue').last().click({ timeout: 30000 })
  await page.getByTestId('intake-frequency-daily').last().click()
  await page.getByTestId('intake-minutes-10').last().click()
  await page.getByTestId('intake-continue').last().click()
  await expect(page.getByTestId('intake-finish').last()).toBeEnabled({ timeout: 45000 })

  // What a phone browser does to a tab it put away: load the same URL fresh.
  // The path comes back from the draft rather than generating again.
  //
  // The run stops short of finishing: after a second page load in WebKit, the
  // first write that grows the database hangs the SQLite worker, which is its
  // own bug, not this flow's.
  await page.reload()
  await expect(page).toHaveURL(/\/intake\/direction$/)
  await expect(page.getByTestId('intake-finish').last()).toBeEnabled()

  // Back walks the questions even though this page load started on the last one.
  await page.getByRole('button', { name: 'Back' }).last().click()
  await expect(page).toHaveURL(/\/intake\/time$/)
  // Continue needs both time answers, so they came back too.
  await expect(page.getByTestId('intake-continue').last()).toBeEnabled()
})

test('an intake page with nothing answered goes back to the first question', async ({ page }) => {
  await page.goto('/intake/direction')
  await expect(page).toHaveURL(/\/intake\/learn$/)
})

test('back from the first question is never a dead end', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('intake-start').click()
  await expect(page).toHaveURL(/\/intake\/learn$/)
  await page.getByLabel('Back').last().click()
  await expect(page).toHaveURL(/\/intake\/welcome$/)

  // Again, this time as a run picked up from a draft: nothing is behind it in
  // the stack, and the first question is the one screen with nowhere else to go.
  await page.getByTestId('intake-start').click()
  await page.getByTestId('intake-learn').last().fill('Conversational German')
  await expect(page.getByTestId('intake-learn').last()).toHaveValue('Conversational German')
  await page.goto('/')
  await expect(page).toHaveURL(/\/intake\/learn$/)
  await page.getByLabel('Back').last().click()
  await expect(page).toHaveURL(/\/intake\/welcome$/)
})
