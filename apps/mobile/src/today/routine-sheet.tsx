import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import {
  libraryPrefsForSection,
  SECTIONS,
  type RoutineOutput,
  type Section,
} from '@thinkering/core'
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
 * "Configure learning routine" (docs/01 §3): the daily rhythm, then one
 * free-text question that G11 interprets into library activations and a
 * preference note, confirmed in one line. The rhythm itself is fixed for now;
 * the feedback board post is where people can ask to change it.
 */

const ROUTINE_FEEDBACK_URL = 'https://thinkering.featurebase.app/p/customize-learning-routine'

const ROUTINE: { section: Section; what: string; cadence: string }[] = [
  { section: 'next', what: 'Learn something new', cadence: '1 a day' },
  { section: 'strengthen', what: 'Review and deepen what you’ve learned', cadence: '1 a day' },
  {
    section: 'go_further',
    what: 'Put your learning to use, or take it further',
    cadence: 'Optional',
  },
]

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
      <Text className="font-sans text-secondary leading-relaxed text-ink-soft">
        The sections are set for now. To change that, upvote or comment on{' '}
        <Text
          className="text-cornflower-deep"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(ROUTINE_FEEDBACK_URL)}
        >
          the feedback board
        </Text>
        .
      </Text>
      <View className="gap-4">
        {ROUTINE.map(({ section, what, cadence }) => (
          <View key={section} className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-medium text-body text-ink">{SECTION_LABELS[section]}</Text>
              <Text className="font-sans text-secondary text-ink-soft">{what}</Text>
            </View>
            <Text className="font-sans text-secondary text-ink-soft">{cadence}</Text>
          </View>
        ))}
      </View>
      {status === 'pending' ? (
        <Generating label="Adjusting your routine" />
      ) : status === 'idle' ? (
        <View className="gap-3">
          <View className="gap-1">
            <Text className="font-sans-semibold text-body text-ink">
              What would you like more or less of?
            </Text>
            <Text className="font-sans text-secondary text-ink-soft">
              Your activities will follow it from here on.
            </Text>
          </View>
          <TextField
            value={request}
            onChangeText={setRequest}
            multiline
            placeholder="More speaking practice, less grammar"
          />
        </View>
      ) : (
        <Text className="font-sans text-body text-ink">{message}</Text>
      )}
    </Sheet>
  )
}
