import { useState } from 'react'
import { Text, View } from 'react-native'

import { exportToFile, importFromFile, refusalMessage } from '@/backup/actions'
import { Button } from '@/components/button'
import { confirmDestructive } from '@/components/confirm'
import { SubScreen } from '@/components/sub-screen'
import { Toast } from '@/components/toast'

/**
 * Me → Backup (docs/01 §7). Phase 1 of docs/02's backup plan: a versioned JSON
 * file the user owns, and the import that puts it back.
 */

export default function BackupScreen() {
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runExport = async () => {
    setBusy('export')
    setError(null)
    try {
      await exportToFile(Date.now())
    } catch {
      setError("We couldn't write the file.")
    } finally {
      setBusy(null)
    }
  }

  const runImport = async () => {
    setError(null)
    const confirmed = await confirmDestructive({
      title: 'Replace everything on this device?',
      message: 'Your interests, path, and history here are replaced by the backup.',
      confirmLabel: 'Choose a file',
    })
    if (!confirmed) return

    setBusy('import')
    try {
      const outcome = await importFromFile()
      if (outcome.ok) setToast('Backup restored')
      else if (outcome.reason !== 'cancelled') setError(refusalMessage(outcome.reason))
    } finally {
      setBusy(null)
    }
  }

  return (
    <SubScreen title="Backup">
      <View className="gap-3">
        <Text className="font-heading-bold text-heading text-ink">A file you keep</Text>
        <Text className="font-sans text-secondary text-ink-soft">
          Everything you&apos;ve made, as one JSON file. Importing replaces what&apos;s on this
          device.
        </Text>
        <Button
          label={busy === 'export' ? 'Exporting…' : 'Export data'}
          onPress={() => void runExport()}
          disabled={busy !== null}
        />
        <Button
          label={busy === 'import' ? 'Importing…' : 'Import data'}
          variant="quiet"
          onPress={() => void runImport()}
          disabled={busy !== null}
        />
        {error ? <Text className="font-sans text-secondary text-peach">{error}</Text> : null}
      </View>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SubScreen>
  )
}
