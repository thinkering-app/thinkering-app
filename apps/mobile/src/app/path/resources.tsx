import Ionicons from '@expo/vector-icons/Ionicons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  createResource,
  getInterest,
  listResources,
  softDeleteResource,
  type Resource,
} from '@thinkering/db'

import { describeAiError } from '@/ai'
import { Button } from '@/components/button'
import { Generating } from '@/components/generating'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { track } from '@/analytics'
import { db, repoContext } from '@/db'
import {
  draftResource,
  hostOf,
  LinkError,
  normalizeUrl,
  type ResourceDraft,
} from '@/resources/link'
import { colors } from '@/theme/tokens'

/**
 * Resources for the interest (docs/01 §5): what G4 found after intake and what
 * the learner has pasted since. Activity generation reads them as context, so
 * this screen is also where a bad suggestion gets removed.
 */
export default function ResourcesScreen() {
  const { interestId } = useLocalSearchParams<{ interestId: string }>()
  const interest = interestId ? getInterest(db, interestId) : undefined
  const [version, setVersion] = useState(0)
  const resources = useMemo(
    () => (interestId ? listResources(db, interestId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the re-read trigger
    [interestId, version],
  )
  const [adding, setAdding] = useState(false)

  if (!interest) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-paper">
        <Text className="font-sans text-body text-ink-soft">That interest is gone.</Text>
      </SafeAreaView>
    )
  }

  const remove = (resource: Resource) => {
    Alert.alert('Remove this resource?', resource.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          softDeleteResource(db, repoContext, resource.id)
          setVersion((n) => n + 1)
        },
      },
    ])
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
        <Text className="font-heading-bold text-title text-ink">Resources</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 py-6">
        {resources.length === 0 ? (
          <Text className="px-3 py-6 text-center font-sans text-body text-ink-soft">
            Nothing saved yet. Paste a link to something worth coming back to.
          </Text>
        ) : (
          resources.map((resource) => (
            <Pressable
              key={resource.id}
              accessibilityRole="link"
              accessibilityLabel={`Open ${resource.title}`}
              onPress={() => void Linking.openURL(resource.url)}
              onLongPress={() => remove(resource)}
              className="gap-1 rounded-card border border-hairline bg-surface p-4"
            >
              <View className="flex-row items-start gap-3">
                <View className="flex-1 gap-1">
                  <Text className="font-heading text-body text-ink">{resource.title}</Text>
                  <Text className="font-sans text-caption text-ink-soft">
                    {hostOf(resource.url)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${resource.title}`}
                  onPress={() => remove(resource)}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={18} color={colors.ink.soft} />
                </Pressable>
              </View>
              {resource.description ? (
                <Text className="font-sans text-secondary text-ink-soft">
                  {resource.description}
                </Text>
              ) : null}
              {resource.howToUse ? (
                <Text className="pt-1 font-sans text-secondary text-ink">{resource.howToUse}</Text>
              ) : null}
            </Pressable>
          ))
        )}
        <View className="pt-2">
          <Button label="Add a link" onPress={() => setAdding(true)} />
        </View>
      </ScrollView>

      <AddLinkSheet
        key={adding ? 'open' : 'closed'}
        visible={adding}
        onClose={() => setAdding(false)}
        interest={interest}
        onSaved={() => setVersion((n) => n + 1)}
      />
    </SafeAreaView>
  )
}

function AddLinkSheet({
  visible,
  onClose,
  interest,
  onSaved,
}: {
  visible: boolean
  onClose: () => void
  interest: NonNullable<ReturnType<typeof getInterest>>
  onSaved: () => void
}) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'url' | 'fetching' | 'draft' | 'error'>('url')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<ResourceDraft | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [howToUse, setHowToUse] = useState('')

  const fetchDraft = async () => {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError("That doesn't look like a link.")
      setStatus('error')
      return
    }
    setStatus('fetching')
    try {
      const result = await draftResource(interest, normalized)
      setDraft(result)
      setTitle(result.title)
      setDescription(result.description)
      setHowToUse(result.howToUse)
      setStatus('draft')
    } catch (e) {
      setError(e instanceof LinkError ? e.message : describeAiError(e))
      setStatus('error')
    }
  }

  const save = () => {
    if (!draft) return
    createResource(db, repoContext, {
      interestId: interest.id,
      url: draft.url,
      title: title.trim() || draft.title,
      description: description.trim(),
      howToUse: howToUse.trim() || null,
      summary: draft.summary,
      source: 'user',
      goalIds: draft.goalIds,
    })
    track('resource_added', { source: 'user' })
    onSaved()
    onClose()
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a link"
      footer={
        status === 'draft' ? (
          <Button label="Save" onPress={save} />
        ) : status === 'fetching' ? null : (
          <Button
            label="Look it up"
            onPress={() => void fetchDraft()}
            disabled={url.trim().length === 0}
          />
        )
      }
    >
      {status === 'fetching' ? (
        <Generating label="Reading the page" />
      ) : status === 'draft' ? (
        <>
          <Text className="font-sans text-caption text-ink-soft">{hostOf(draft?.url ?? '')}</Text>
          <TextField value={title} onChangeText={setTitle} accessibilityLabel="Resource title" />
          <TextField
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel="What it is"
          />
          <TextField
            value={howToUse}
            onChangeText={setHowToUse}
            multiline
            placeholder="How this could be used"
            accessibilityLabel="How this could be used"
          />
        </>
      ) : (
        <>
          <TextField
            value={url}
            onChangeText={(text) => {
              setUrl(text)
              if (status === 'error') setStatus('url')
            }}
            placeholder="Paste a link"
            autoFocus
            accessibilityLabel="Link to add"
            onSubmitEditing={() => void fetchDraft()}
          />
          {status === 'error' ? (
            <Text className="font-sans text-secondary text-ink">{error}</Text>
          ) : null}
        </>
      )}
    </Sheet>
  )
}
