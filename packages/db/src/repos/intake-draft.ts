import { parseIntakeDraft, type IntakeDraft } from '@thinkering/core'
import type { Database } from '../database'
import { deleteSetting, getSetting, setSetting } from './settings'

/**
 * The one unfinished intake (docs/01 §1), kept in local settings: never synced
 * or exported, and gone once the interest is saved. Starting a new intake
 * replaces it.
 */
const KEY = 'intake_draft'

/** The draft, if there is one that still parses; an unreadable one is cleared. */
export function getIntakeDraft(db: Database): IntakeDraft | undefined {
  const stored = getSetting<unknown>(db, KEY)
  if (stored === undefined) return undefined
  const draft = parseIntakeDraft(stored)
  if (!draft) deleteSetting(db, KEY)
  return draft
}

export function saveIntakeDraft(db: Database, draft: IntakeDraft): void {
  setSetting(db, KEY, draft)
}

export function clearIntakeDraft(db: Database): void {
  deleteSetting(db, KEY)
}
