/**
 * Web export/import: a download link and a file input, since there is no share
 * sheet or document picker in the browser (docs/02 §Platform strategy).
 */

export async function shareJsonFile(filename: string, json: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    // Dismissing the picker fires no event in most browsers; `cancel` covers the
    // ones that support it and the rest simply leave the promise pending, which
    // is harmless — the screen stays where it is.
    input.addEventListener('cancel', () => resolve(null))
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      void file.text().then(resolve)
    })
    input.click()
  })
}
