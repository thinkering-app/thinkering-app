import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/**
 * The file half of export/import (docs/02 §Backup & sync, phase 1): write to the
 * cache and hand it to the share sheet, or pick one back. The web build has its
 * own implementation (`file.web.ts`) using a download and a file input.
 */

export async function shareJsonFile(filename: string, json: string): Promise<void> {
  const file = new File(Paths.cache, filename)
  if (file.exists) file.delete()
  file.create()
  file.write(json)
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device')
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: filename,
  })
}

/** Resolves to the file's text, or null if the picker was dismissed. */
export async function pickJsonFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] })
  if (picked.canceled) return null
  return picked.result.text()
}
