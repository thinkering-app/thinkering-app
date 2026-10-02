import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
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
import { ContextSheet, CONTEXT_KIND_LABEL_KEY } from '@/path/context-sheet'
import { colors } from '@/theme/tokens'

/**
 * Path settings (docs/01 §5): every intake answer, editable, plus the contexts
 * Go further activities can draw on. Text edits, outcomes included,
 * commit with Save, pinned below the scroll and enabled only once something
 * would change; the lists (topics, contexts) act as they're tapped.
 */

const WHY_LABEL_KEY = {
  career: 'path.settings.why.career',
  personal_goal: 'path.settings.why.personalGoal',
  fun: 'path.settings.why.fun',
} as const satisfies Record<WhyChoice, string>

const EXPERIENCE_LABEL_KEY = {
  getting_started: 'path.settings.experience.gettingStarted',
  explored: 'path.settings.experience.explored',
  in_middle: 'path.settings.experience.inMiddle',
  experienced: 'path.settings.experience.experienced',
} as const satisfies Record<ExperienceChoice, string>

const FREQUENCY_LABEL_KEY = {
  daily: 'path.settings.frequency.daily',
  several_weekly: 'path.settings.frequency.severalWeekly',
  when_i_can: 'path.settings.frequency.whenICan',
} as const satisfies Record<Frequency, string>

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
  const { t } = useTranslation()
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
        <Text className="font-sans text-body text-ink-soft">{t('path.interestGone')}</Text>
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

  const successOutcomes = cleanOutcomes(outcomes)
  const patch = {
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
  }
  // Pending only when Save would write something different — stray spaces and
  // blank outcome rows don't count.
  const dirty =
    patch.name !== interest.name ||
    patch.wantToLearn !== interest.wantToLearn ||
    patch.whyChoice !== interest.whyChoice ||
    patch.whyText !== (interest.whyText ?? null) ||
    patch.experienceChoice !== interest.experienceChoice ||
    patch.experienceText !== (interest.experienceText ?? null) ||
    successOutcomes.join('\n') !== (interest.successOutcomes ?? []).join('\n') ||
    patch.frequency !== interest.frequency ||
    patch.sessionMinutes !== interest.sessionMinutes ||
    patch.approachNotes !== interest.approachNotes

  const save = () => {
    updateInterest(db, repoContext, interest.id, patch)
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
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center gap-3 px-5 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('path.back')}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
          <Text className="font-heading-bold text-title text-ink">{t('path.settings.title')}</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-5 py-6"
          keyboardShouldPersistTaps="handled"
        >
          <Field label={t('path.settings.interestName')}>
            <TextField
              value={name}
              onChangeText={setName}
              accessibilityLabel={t('path.settings.interestName')}
              limit="line"
            />
          </Field>

          <Field label={t('path.settings.wantToLearn')}>
            <TextField
              value={wantToLearn}
              onChangeText={setWantToLearn}
              multiline
              accessibilityLabel={t('path.settings.wantToLearn')}
              limit="wantToLearn"
            />
          </Field>

          <Field label={t('path.settings.why.label')}>
            <Chips
              options={WHY_CHOICES}
              labels={{
                career: t(WHY_LABEL_KEY.career),
                personal_goal: t(WHY_LABEL_KEY.personal_goal),
                fun: t(WHY_LABEL_KEY.fun),
              }}
              value={whyChoice}
              onChange={setWhyChoice}
            />
            <TextField
              value={whyText}
              onChangeText={setWhyText}
              placeholder={t('path.settings.anythingMorePlaceholder')}
              multiline
              accessibilityLabel={t('path.settings.why.moreAccessibilityLabel')}
              limit="note"
            />
          </Field>

          <Field label={t('path.settings.experience.label')}>
            <Chips
              options={EXPERIENCE_CHOICES}
              labels={{
                getting_started: t(EXPERIENCE_LABEL_KEY.getting_started),
                explored: t(EXPERIENCE_LABEL_KEY.explored),
                in_middle: t(EXPERIENCE_LABEL_KEY.in_middle),
                experienced: t(EXPERIENCE_LABEL_KEY.experienced),
              }}
              value={experienceChoice}
              onChange={setExperienceChoice}
            />
            <TextField
              value={experienceText}
              onChangeText={setExperienceText}
              placeholder={t('path.settings.anythingMorePlaceholder')}
              multiline
              accessibilityLabel={t('path.settings.experience.moreAccessibilityLabel')}
              limit="note"
            />
          </Field>

          <Field label={t('path.settings.hopingFor')}>
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
                    placeholder={t('path.settings.outcomePlaceholder')}
                    accessibilityLabel={t('path.settings.outcomeAccessibilityLabel')}
                    limit="line"
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('path.settings.removeOutcomeAccessibilityLabel', {
                    name: outcome.text || t('path.settings.outcomeWord'),
                  })}
                  onPress={() => setOutcomes((rows) => rows.filter((r) => r.key !== outcome.key))}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={18} color={colors.ink.soft} />
                </Pressable>
              </View>
            ))}
            <Button label={t('path.settings.addOutcome')} variant="quiet" onPress={addOutcome} />
          </Field>

          <Field label={t('path.settings.frequency.label')}>
            <Chips
              options={FREQUENCIES}
              labels={{
                daily: t(FREQUENCY_LABEL_KEY.daily),
                several_weekly: t(FREQUENCY_LABEL_KEY.several_weekly),
                when_i_can: t(FREQUENCY_LABEL_KEY.when_i_can),
              }}
              value={frequency}
              onChange={setFrequency}
            />
          </Field>

          <Field label={t('path.settings.session.label')}>
            <View className="flex-row flex-wrap items-center gap-2">
              {PRESET_MINUTES.map((minutes) => (
                <ChoiceChip
                  key={minutes}
                  label={t('path.settings.session.option', { count: minutes })}
                  selected={sessionMinutes === minutes}
                  onPress={() => setSessionMinutes(minutes)}
                />
              ))}
              <View className="flex-row items-center gap-2 rounded-pill border border-hairline bg-surface px-4 py-2.5">
                <TextInput
                  accessibilityLabel={t('path.settings.session.customAccessibilityLabel')}
                  value={PRESET_MINUTES.includes(sessionMinutes) ? '' : String(sessionMinutes)}
                  onChangeText={(text) => {
                    const digits = Number(text.replace(/[^0-9]/g, '').slice(0, 3))
                    if (digits > 0) setSessionMinutes(digits)
                  }}
                  keyboardType="number-pad"
                  placeholder={t('path.settings.session.customPlaceholder')}
                  placeholderTextColor={colors.ink.soft}
                  className="min-w-14 font-sans text-body text-ink"
                />
                <Text className="font-sans text-body text-ink-soft">
                  {t('path.settings.session.unit')}
                </Text>
              </View>
            </View>
          </Field>

          <Field label={t('path.settings.topics.label')}>
            <View className="flex-row flex-wrap gap-2">
              {topics.map((topic) => (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('path.settings.topics.removeAccessibilityLabel', {
                    label: topic.label,
                  })}
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
                  placeholder={t('path.settings.topics.addPlaceholder')}
                  accessibilityLabel={t('path.settings.topics.addAccessibilityLabel')}
                  onSubmitEditing={addTopic}
                  limit="line"
                />
              </View>
              <Button
                label={t('common.add')}
                variant="quiet"
                onPress={addTopic}
                disabled={isOverLimit(newTopic, 'line')}
              />
            </View>
          </Field>

          <Field label={t('path.settings.approachNotes')}>
            <TextField
              value={approachNotes}
              onChangeText={setApproachNotes}
              multiline
              accessibilityLabel={t('path.settings.approachNotes')}
              limit="note"
            />
          </Field>

          <Field label={t('path.settings.contexts.label')}>
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
                  {t(CONTEXT_KIND_LABEL_KEY[context.kind])}
                </Text>
                <Text className="font-sans-medium text-body text-ink">{context.label}</Text>
                {context.notes ? (
                  <Text className="font-sans text-secondary text-ink-soft">{context.notes}</Text>
                ) : null}
              </Pressable>
            ))}
            <Button
              label={t('path.settings.contexts.add')}
              variant="quiet"
              onPress={() => {
                setEditingContext(null)
                setContextSheetOpen(true)
              }}
            />
          </Field>
        </ScrollView>

        <View className="px-5 pb-2 pt-2">
          <Button label={t('common.save')} onPress={save} disabled={!dirty || tooLong} />
        </View>
      </KeyboardAvoidingView>

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
  /** Already resolved with `t()` at the call site — built fresh each render, never a module-level constant. */
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
