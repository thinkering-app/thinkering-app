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
