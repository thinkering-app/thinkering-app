const LEAD_NUMBER = /^\s*(?:step\s+\d+\s*[.:)\-–—]?|\d+\s*[.:)])(?:\s+|$)|^\s*\d+\s*$/i

/**
 * A steps label, step or numbered list item without the number the model
 * sometimes writes into it (docs/05). The renderer numbers these itself, so
 * "1", "Step 2:" or "3. Commit" would show twice. Only a number that reads as
 * a marker goes: "3 eggs" and "1.5 cups" are content and stay.
 */
export function withoutLeadNumber(text: string): string {
  return text.replace(LEAD_NUMBER, '').trim()
}
