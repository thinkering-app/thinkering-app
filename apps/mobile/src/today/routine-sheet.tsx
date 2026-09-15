import { useState } from 'react'
import { Text, View } from 'react-native'
import { libraryPrefsForSection, SECTIONS, type RoutineOutput } from '@thinkering/core'
import {
  createRoutineNote,
  getInterest,
  listGoals,
  listLibraryPrefs,
  listRoutineNotes,
  setLibraryPref,
} from '@thinkering/db'

import { callAi } from '@/ai'
import { librarySituation } from '@/ai/context'
import { describeAiError } from '@/ai/generation'
import { Button } from '@/components/button'
import { Generating } from '@/components/generating'
import { SECTION_LABELS } from '@/components/section-header'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'

/**
 * "Configure learning routine" (docs/01 §3): one free-text question, G11
 * interprets it into library activations and a preference note, and the sheet
 * confirms the change in one line.
 */
export function RoutineSheet({
  visible,
  onClose,
  interestId,
  onChanged,
}: {
  visible: boolean
  onClose: () => void
  interestId: string
  onChanged: () => void
}) {
  const [request, setRequest] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async () => {
    const interest = getInterest(db, interestId)
    if (!interest || request.trim().length === 0) return
    setStatus('pending')
    try {
      const goals = listGoals(db, interestId)
      const situation = librarySituation(goals)
      const prefs = listLibraryPrefs(db, interestId)
      const current = SECTIONS.flatMap((section) =>
        libraryPrefsForSection(section, prefs, situation).map(({ item, active }) => ({
          section,
          libraryItemId: item.id,
          name: item.name,
          active,
        })),
      )
      const { output } = await callAi<RoutineOutput>(
        'routine.customize',
        {
          interestName: interest.name,
          wantToLearn: interest.wantToLearn,
          request: request.trim(),
          current,
          existingNotes: listRoutineNotes(db, interestId).map((n) => n.note),
        },
        { interestId },
      )
      for (const activation of output.activations) {
        setLibraryPref(db, repoContext, {
          interestId,
          section: activation.section,
          libraryItemId: activation.libraryItemId,
          active: activation.active,
        })
      }
      createRoutineNote(db, repoContext, { interestId, note: output.note })
      track('routine_configured', { via: 'free_text' })
      setMessage(output.note)
      setStatus('done')
      onChanged()
    } catch (e) {
      setMessage(describeAiError(e))
      setStatus('error')
    }
  }

  const close = () => {
    setRequest('')
    setStatus('idle')
    setMessage('')
    onClose()
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Learning routine"
      footer={
        status === 'done' ? (
          <Button label="Done" onPress={close} />
        ) : (
          <Button
            label="Save"
            onPress={() => void submit()}
            disabled={request.trim().length === 0 || status === 'pending'}
          />
        )
      }
    >
      <View className="gap-1">
        {SECTIONS.map((section) => (
          <Text key={section} className="font-sans text-secondary text-ink-soft">
            {SECTION_LABELS[section]}
          </Text>
        ))}
      </View>
      {status === 'pending' ? (
        <Generating label="Adjusting your routine" />
      ) : status === 'idle' ? (
        <>
          <Text className="font-heading text-heading text-ink">
            How would you want to customize your learning routine?
          </Text>
          <TextField
            value={request}
            onChangeText={setRequest}
            multiline
            placeholder="More speaking, less grammar"
          />
        </>
      ) : (
        <Text className="font-sans text-body text-ink">{message}</Text>
      )}
    </Sheet>
  )
}
