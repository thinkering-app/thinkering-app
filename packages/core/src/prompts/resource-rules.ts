/**
 * Prompt fragments shared by the two resource searches — G4 `resources.search`
 * (the pair intake seeds) and G12 `resources.more` (the panel's Find more).
 * Both answer to `resourcesSearchOutputSchema`, so the output contract and the
 * rules protecting it live here; each kind writes its own brief above them and
 * owns its own count, search budget and version.
 */

export const RESOURCE_JSON = `Return JSON (and nothing else after your searches): {
  "resources": [{
    "url": string,            // the real, working URL you found
    "title": string,          // the resource's own title
    "description": string,    // one or two lines: what it is and why it's worth their time
    "howToUse": string,       // one or two lines on how to use it alongside their goals — watch for X, try Y after reading
    "summary": string,        // a fuller summary for later activity generation; the learner never sees it
    "goalTitles": [string]    // the goals it serves, copied exactly from the list below; [] if it serves the path generally
  }]
}`

/**
 * The "specific page" rule is not a preference: `groundBlocks`
 * (packages/core/activity/resources.ts) refuses to play a channel or a
 * homepage inside an activity, so a hub saved as a resource is dead weight.
 */
export const RESOURCE_RULES = `- Search before answering.
- Link the page they will actually open: one video, one article, one documentation page, one course lesson. A channel, playlist, homepage, search result or index page is not a resource — an activity can play a specific video and quote a specific article, and can do nothing with a hub.
- Reputable: a well-regarded explainer, documentation, a course page, a good video. No SEO filler, no listicles, nothing behind a hard paywall.
- Only include a URL you actually saw in search results. Never construct or guess one.
- Match their level and their session length: something that takes an hour is fine as a resource, but say so in how-to-use.
- Copy goal titles exactly. A resource that fits no single goal gets an empty list rather than a wrong one.`

/** The saved URLs a search must not hand back, as message lines. */
export function excludeUrlLines(urls: readonly string[] | undefined): string[] {
  if (!urls || urls.length === 0) return []
  return [
    '',
    'They already have these — do not return them, or near-duplicates of them:',
    ...urls.map((u) => `- ${u}`),
  ]
}
