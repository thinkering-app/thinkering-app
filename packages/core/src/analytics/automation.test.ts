import { describe, expect, it } from 'vitest'
import { isAutomatedClient } from './automation'

describe('isAutomatedClient', () => {
  it('flags automated browsers and bots', () => {
    expect(isAutomatedClient({ webdriver: true })).toBe(true)
    for (const userAgent of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)',
      'vercel-screenshot/1.0',
    ]) {
      expect(isAutomatedClient({ userAgent })).toBe(true)
    }
  })

  it('lets real browsers through', () => {
    for (const userAgent of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    ]) {
      expect(isAutomatedClient({ userAgent, webdriver: false })).toBe(false)
    }
    expect(isAutomatedClient({})).toBe(false)
  })
})
