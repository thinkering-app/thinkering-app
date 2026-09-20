import { exportData, importData, parseExportFile, type ImportRefusal } from '@thinkering/db'

import { db } from '@/db'
import { pickJsonFile, shareJsonFile } from './file'

/**
 * Export/import as the Backup screen uses them (docs/01 §7). Import is
 * confirm-replace: the file becomes the device's learning data, and anything
 * that was there is gone — the screen asks first.
 */

export function backupFilename(now: number): string {
  const date = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `thinkering-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

export async function exportToFile(now: number): Promise<void> {
  const file = exportData(db, now)
  await shareJsonFile(backupFilename(now), JSON.stringify(file))
}

export type ImportOutcome =
  { ok: true; rowCount: number } | { ok: false; reason: ImportRefusal | 'cancelled' }

export async function importFromFile(): Promise<ImportOutcome> {
  let text: string | null
  try {
    text = await pickJsonFile()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (text === null) return { ok: false, reason: 'cancelled' }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  const parsed = parseExportFile(json)
  if (!parsed.ok) return { ok: false, reason: parsed.reason }

  const { rowCount } = importData(db, parsed.rows)
  return { ok: true, rowCount }
}

export function refusalMessage(reason: ImportRefusal): string {
  switch (reason) {
    case 'newer_format':
    case 'newer_schema':
      return 'That backup came from a newer version of thinkering. Update the app, then try again.'
    case 'invalid':
      return "That backup is damaged — some of it couldn't be read."
    case 'unreadable':
      return "That file isn't a thinkering backup."
  }
}
