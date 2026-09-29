import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  EXPERIENCE_CHOICES,
  FREQUENCIES,
  isOverLimit,
  WHY_CHOICES,
  type ExperienceChoice,
  type Frequency,
  type WhyChoice,
} from '@thinkering/core'
import {
  createContext,
  createTopic,
  getInterest,
  listContexts,
  listTopics,
  softDeleteContext,
  softDeleteTopic,
  updateContext,
  updateInterest,
  type Context,
} from '@thinkering/db'

import { Button } from '@/components/button'
import { ChoiceChip } from '@/components/choice-chip'
import { TextField } from '@/components/text-field'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import { ContextSheet, CONTEXT_KIND_LABEL } from '@/path/context-sheet'
import { colors } from '@/theme/tokens'

/**
 * Path settings (docs/01 §5): every intake answer, editable, plus the contexts
 * Go further activities can draw on. Text edits, outcomes included,
 * commit with Save; the lists (topics, contexts) act as they're tapped.
 */

const WHY_LABEL: Record<WhyChoice, string> = {
  career: 'For my career',
  personal_goal: 'For a personal goal',
  fun: 'For fun',
}

const EXPERIENCE_LABEL: Record<ExperienceChoice, string> = {
  getting_started: 'Just getting started',
  explored: 'Explored a bit',
  in_middle: 'In the middle',
  experienced: 'Have a lot of experience',
}

const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: 'Daily',
  several_weekly: 'Several times a week',
  when_i_can: 'When I can',
}

const PRESET_MINUTES = [5, 10, 15]

/** An outcome row being edited; `key` keeps focus steady as rows come and go. */
interface OutcomeDraft {
  key: number
  text: string
}

/** Trimmed, blanks and case-insensitive repeats dropped, in their order. */
function cleanOutcomes(drafts: OutcomeDraft[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const { text } of drafts) {
    const outcome = text.trim()
    if (!outcome || seen.has(outcome.toLowerCase())) continue
    seen.add(outcome.toLowerCase())
    out.push(outcome)
  }
  return out
}

export default function PathSettingsScreen() {
  const { interestId } = useLocalSearchParams<{ interestId: string }>()
  const [version, setVersion] = useState(0)
  const interest = useMemo(
    () => (interestId ? getInterest(db, interestId) : undefined),
    [interestId],
  )
  const topics = useMemo(
    () => (interest ? listTopics(db, interest.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
    [interest?.id, version],
  )
  const contexts = useMemo(
    () => (interest ? listContexts(db, interest.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
    [interest?.id, version],
  )

  const [name, setName] = useState(interest?.name ?? '')
  const [wantToLearn, setWantToLearn] = useState(interest?.wantToLearn ?? '')
  const [whyChoice, setWhyChoice] = useState<WhyChoice>(interest?.whyChoice ?? 'personal_goal')
  const [whyText, setWhyText] = useState(interest?.whyText ?? '')
  const [experienceChoice, setExperienceChoice] = useState<ExperienceChoice>(
    interest?.experienceChoice ?? 'getting_started',
  )
  const [experienceText, setExperienceText] = useState(interest?.experienceText ?? '')
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>(() =>
    (interest?.successOutcomes ?? []).map((text, key) => ({ key, text })),
  )
  const nextOutcomeKey = useRef(outcomes.length)
  const [frequency, setFrequency] = useState<Frequency>(interest?.frequency ?? 'several_weekly')
  const [sessionMinutes, setSessionMinutes] = useState(interest?.sessionMinutes ?? 10)
  const [approachNotes, setApproachNotes] = useState(interest?.approachNotes ?? '')
  const [newTopic, setNewTopic] = useState('')
  const [editingContext, setEditingContext] = useState<Context | null>(null)
  const [contextSheetOpen, setContextSheetOpen] = useState(false)

  if (!interest) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-paper">
        <Text className="font-sans text-body text-ink-soft">That interest is gone.</Text>
      </SafeAreaView>
    )
  }

  const tooLong =
    isOverLimit(name, 'line') ||
    isOverLimit(wantToLearn, 'wantToLearn') ||
    isOverLimit(whyText, 'note') ||
    isOverLimit(experienceText, 'note') ||
    isOverLimit(approachNotes, 'note') ||
    outcomes.some((o) => isOverLimit(o.text, 'line'))

  const save = () => {
    const successOutcomes = cleanOutcomes(outcomes)
    updateInterest(db, repoContext, interest.id, {
      name: name.trim() || interest.name,
      wantToLearn: wantToLearn.trim() || interest.wantToLearn,
      whyChoice,
      whyText: whyText.trim() || null,
      experienceChoice,
      experienceText: experienceText.trim() || null,
      successOutcomes: successOutcomes.length > 0 ? successOutcomes : null,
      frequency,
      sessionMinutes,
      approachNotes: approachNotes.trim(),
    })
    track('settings_changed', { key: 'path_settings' })
    if (frequency !== interest.frequency) track('settings_changed', { key: 'frequency' })
    if (sessionMinutes !== interest.sessionMinutes)
      track('settings_changed', { key: 'session_minutes' })
    router.back()
  }

  const addOutcome = () => {
    const key = nextOutcomeKey.current++
    setOutcomes((rows) => [...rows, { key, text: '' }])
  }

  const addTopic = () => {
    const label = newTopic.trim()
    if (label.length === 0 || isOverLimit(label, 'line')) return
    createTopic(db, repoContext, {
      interestId: interest.id,
      label,
      origin: 'user',
      selected: true,
      sortOrder: (topics.at(-1)?.sortOrder ?? 0) + 1,
    })
    setNewTopic('')
    setVersion((n) => n + 1)
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 px-5 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text className="font-heading-bold text-title text-ink">Path settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Interest name">
          <TextField
            value={name}
            onChangeText={setName}
            accessibilityLabel="Interest name"
            limit="line"
          />
        </Field>

        <Field label="What you want to learn">
          <TextField
            value={wantToLearn}
            onChangeText={setWantToLearn}
            multiline
            accessibilityLabel="What you want to learn"
            limit="wantToLearn"
          />
        </Field>

        <Field label="Why">
          <Chips
            options={WHY_CHOICES}
            labels={WHY_LABEL}
            value={whyChoice}
            onChange={setWhyChoice}
          />
          <TextField
            value={whyText}
            onChangeText={setWhyText}
            placeholder="Anything more"
            multiline
            accessibilityLabel="Why, in your words"
            limit="note"
          />
        </Field>

        <Field label="Experience">
          <Chips
            options={EXPERIENCE_CHOICES}
            labels={EXPERIENCE_LABEL}
            value={experienceChoice}
            onChange={setExperienceChoice}
          />
          <TextField
            value={experienceText}
            onChangeText={setExperienceText}
            placeholder="Anything more"
            multiline
            accessibilityLabel="Experience, in your words"
            limit="note"
          />
        </Field>

        <Field label="What you're hoping for">
          {outcomes.map((outcome) => (
            <View key={outcome.key} className="flex-row items-center gap-2">
              <View className="flex-1">
                <TextField
                  value={outcome.text}
                  onChangeText={(text) =>
                    setOutcomes((rows) =>
                      rows.map((r) => (r.key === outcome.key ? { ...r, text } : r)),
                    )
                  }
                  // Only a just-added row mounts empty; saved outcomes never are.
                  autoFocus={outcome.text === ''}
                  placeholder="An outcome"
                  accessibilityLabel="Outcome"
                  limit="line"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${outcome.text || 'outcome'}`}
                onPress={() => setOutcomes((rows) => rows.filter((r) => r.key !== outcome.key))}
                hitSlop={10}
              >
                <Ionicons name="close" size={18} color={colors.ink.soft} />
              </Pressable>
            </View>
          ))}
          <Button label="Add an outcome" variant="quiet" onPress={addOutcome} />
        </Field>

        <Field label="How often">
          <Chips
            options={FREQUENCIES}
            labels={FREQUENCY_LABEL}
            value={frequency}
            onChange={setFrequency}
          />
        </Field>

        <Field label="Each session">
          <View className="flex-row flex-wrap items-center gap-2">
            {PRESET_MINUTES.map((minutes) => (
              <ChoiceChip
                key={minutes}
                label={`${minutes} min`}
                selected={sessionMinutes === minutes}
                onPress={() => setSessionMinutes(minutes)}
              />
            ))}
            <View className="flex-row items-center gap-2 rounded-pill border border-hairline bg-surface px-4 py-2.5">
              <TextInput
                accessibilityLabel="Custom session length in minutes"
                value={PRESET_MINUTES.includes(sessionMinutes) ? '' : String(sessionMinutes)}
                onChangeText={(text) => {
                  const digits = Number(text.replace(/[^0-9]/g, '').slice(0, 3))
                  if (digits > 0) setSessionMinutes(digits)
                }}
                keyboardType="number-pad"
                placeholder="Custom"
                placeholderTextColor={colors.ink.soft}
                className="min-w-14 font-sans text-body text-ink"
              />
              <Text className="font-sans text-body text-ink-soft">min</Text>
            </View>
          </View>
        </Field>

        <Field label="Topics of interest">
          <View className="flex-row flex-wrap gap-2">
            {topics.map((topic) => (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${topic.label}`}
                onPress={() => {
                  softDeleteTopic(db, repoContext, topic.id)
                  setVersion((n) => n + 1)
                }}
                className="flex-row items-center gap-2 rounded-pill border border-hairline bg-surface px-4 py-2.5"
              >
                <Text className="font-sans-medium text-body text-ink">{topic.label}</Text>
                <Ionicons name="close" size={14} color={colors.ink.soft} />
              </Pressable>
            ))}
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextField
                value={newTopic}
                onChangeText={setNewTopic}
                placeholder="Add a topic"
                accessibilityLabel="Add a topic"
                onSubmitEditing={addTopic}
                limit="line"
              />
            </View>
            <Button
              label="Add"
              variant="quiet"
              onPress={addTopic}
              disabled={isOverLimit(newTopic, 'line')}
            />
          </View>
        </Field>

        <Field label="Approach notes">
          <TextField
            value={approachNotes}
            onChangeText={setApproachNotes}
            multiline
            accessibilityLabel="Approach notes"
            limit="note"
          />
        </Field>

        <Field label="Projects, environments, people">
          {contexts.map((context) => (
            <Pressable
              key={context.id}
              accessibilityRole="button"
              onPress={() => {
                setEditingContext(context)
                setContextSheetOpen(true)
              }}
              className="gap-1 rounded-card border border-hairline bg-surface p-4"
            >
              <Text className="font-sans text-caption text-ink-soft">
                {CONTEXT_KIND_LABEL[context.kind]}
              </Text>
              <Text className="font-sans-medium text-body text-ink">{context.label}</Text>
              {context.notes ? (
                <Text className="font-sans text-secondary text-ink-soft">{context.notes}</Text>
              ) : null}
            </Pressable>
          ))}
          <Button
            label="Add a context"
            variant="quiet"
            onPress={() => {
              setEditingContext(null)
              setContextSheetOpen(true)
            }}
          />
        </Field>

        <Button label="Save" onPress={save} disabled={tooLong} />
      </ScrollView>

      <ContextSheet
        key={editingContext?.id ?? 'new'}
        visible={contextSheetOpen}
        onClose={() => setContextSheetOpen(false)}
        context={editingContext}
        onSave={(draft) => {
          if (editingContext) {
            updateContext(db, repoContext, editingContext.id, {
              kind: draft.kind,
              label: draft.label,
              notes: draft.notes || null,
            })
          } else {
            createContext(db, repoContext, {
              interestId: interest.id,
              kind: draft.kind,
              label: draft.label,
              notes: draft.notes || null,
            })
          }
          setVersion((n) => n + 1)
        }}
        onDelete={
          editingContext
            ? () => {
                softDeleteContext(db, repoContext, editingContext.id)
                setVersion((n) => n + 1)
              }
            : undefined
        }
      />
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="font-sans text-secondary text-ink-soft">{label}</Text>
      {children}
    </View>
  )
}

function Chips<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <ChoiceChip
          key={option}
          label={labels[option]}
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  )
}
