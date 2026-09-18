import { expect, test } from '@playwright/test'

test('intake finishes into today', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('/')
  await page.getByTestId('intake-start').click()
  await page.getByTestId('intake-learn').last().fill('Conversational German')
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-why-fun').last().click()
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-experience-getting_started').last().click()
  await page.getByTestId('intake-continue').last().click()
  await page.getByTestId('intake-frequency-daily').last().click()
  await page.getByTestId('intake-minutes-10').last().click()
  await page.getByTestId('intake-continue').last().click()
  await expect(page).toHaveURL(/\/intake\/topics$/)
  await page.getByTestId('intake-continue').last().click({ timeout: 30000 })
  await expect(page).toHaveURL(/\/intake\/direction$/)
  const finish = page.getByTestId('intake-finish').last()
  await expect(finish).toBeEnabled({ timeout: 45000 })
  await finish.click()

  await expect(page).toHaveURL(/\/today$/)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '../../.context/today-after-intake.png', fullPage: true })
  console.log('ERRORS:', errors.join('\n') || 'none')

  // Reload proves the write landed and the router sends a returning user to Today.
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
})
