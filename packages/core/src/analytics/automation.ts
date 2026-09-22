/**
 * User agents that aren't a person: search and AI crawlers, link unfurlers,
 * uptime checks and headless browsers. Matched case-insensitively. `bot` is
 * only matched followed by `/`, `-`, `;` or the end, so a phone brand like
 * Cubot doesn't read as one.
 */
const AUTOMATED_USER_AGENT =
  /bot[/;-]|bot$|crawl|spider|slurp|headless|lighthouse|prerender|facebookexternal|vercel-screenshot|embedly|inspectiontool/i

/**
 * Whether a web visit is a machine rather than a learner (docs/08): a browser
 * driven by automation (`navigator.webdriver`, set by Playwright, Puppeteer and
 * Selenium) or a user agent that names itself a bot. Sent as the `automated`
 * super property, so dashboards can leave a crawler opening a shared link out.
 */
export function isAutomatedClient(client: { userAgent?: string; webdriver?: boolean }): boolean {
  if (client.webdriver === true) return true
  return AUTOMATED_USER_AGENT.test(client.userAgent ?? '')
}
