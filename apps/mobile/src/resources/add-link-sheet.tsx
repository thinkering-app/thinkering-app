import { useState } from 'react'
import { Text } from 'react-native'
import { isOverLimit, resourceMediaOf, type ResourceMedia } from '@thinkering/core'
import { createResource, type Interest, type Resource } from '@thinkering/db'

import { describeAiError } from '@/ai'
import { track } from '@/analytics'
import { Button } from '@/components/button'
import { Generating } from '@/components/generating'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { db, repoContext } from '@/db'
import { draftResource, hostOf, LinkError, normalizeUrl, type ResourceDraft } from './link'

/**
 * Paste a link, look it up, edit the draft, save (docs/01 §5). Opened from
 * the Resources screen and from a + card whose type is built around a
 * resource (docs/01 §3).
 */
export function AddLinkSheet({
  visible,
  onClose,
  interest,
  media,
  onSaved,
}: {
  visible: boolean
  onClose: () => void
  interest: Interest
  /** Only links of this kind are accepted, for an activity type built around one. */
  media?: ResourceMedia
  onSaved: (resource: Resource) => void
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
    if (media && resourceMediaOf(normalized) !== media) {
      setError(
        media === 'video' ? "That isn't a YouTube video." : "That's a video, not a page to read.",
      )
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
    const resource = createResource(db, repoContext, {
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
    onSaved(resource)
    onClose()
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        media === 'video' ? 'Add a video' : media === 'article' ? 'Add a reading' : 'Add a link'
      }
      footer={
        status === 'draft' ? (
          <Button
            label="Save"
            onPress={save}
            disabled={
              isOverLimit(title, 'line') ||
              isOverLimit(description, 'note') ||
              isOverLimit(howToUse, 'note')
            }
          />
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
          <TextField
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Resource title"
            limit="line"
          />
          <TextField
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel="What it is"
            limit="note"
          />
          <TextField
            value={howToUse}
            onChangeText={setHowToUse}
            multiline
            placeholder="How this could be used"
            accessibilityLabel="How this could be used"
            limit="note"
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
            placeholder={media === 'video' ? 'Paste a YouTube link' : 'Paste a link'}
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
