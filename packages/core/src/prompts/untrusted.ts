/**
 * Text from outside the app — a fetched page, a summary drafted from one —
 * goes into a prompt inside a named tag, and the instructions say what's in
 * that tag is material, never instructions (docs/04 §Untrusted text). A copy
 * of the tag inside the text is dropped, so a page can't close the block early
 * and write its own instructions after it.
 */
export function wrapUntrusted(tag: string, text: string): string {
  const stray = new RegExp(`</?${tag}\\b[^>]*>`, 'gi')
  return `<${tag}>\n${text.replace(stray, '')}\n</${tag}>`
}
