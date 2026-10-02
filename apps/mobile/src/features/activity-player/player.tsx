import Ionicons from '@expo/vector-icons/Ionicons'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ActivityDoc, Page, Rating } from '@thinkering/core'

import { Button } from '@/components/button'
import { FadeIn } from '@/components/fade-in'
import { Generating } from '@/components/generating'
import { ProgressBar } from '@/components/progress-bar'
import { colors } from '@/theme/tokens'
import { AskProvider } from './ask'
import { AskedHeader } from './asked-header'
import { BlockView } from './blocks'
import {
  CELEBRATION_BY_TIER,
  CELEBRATION_MS,
  RisingDots,
  SummaryWashes,
  Sunlight,
  useReduceMotion,
} from './celebration'
import { ResponsesProvider, usePageTooLong, type ResponseSink } from './responses'
import { SummaryFooter, SummaryHeader } from './summary'
import { WaitCover } from './wait-cover'

/**
 * The activity player (docs/05): a page at a time, progress bar across the top,
 * forward and back always available, and the summary page's rating appended by
 * the renderer. Everything about *what* is on a page comes from the document.
 */

export interface PlayerProps {
  doc: ActivityDoc
  /** The goal this activity served, named on the summary page. */
  goalTitle?: string
  /** Pages still arriving from G5b; forward navigation stops at what exists. */
  streaming?: boolean
  /** What the wait says while a streaming document has no pages yet. */
  waitLabel?: string
  /** The library item behind the activity, shown with the wait before page 1. */
  libraryItem?: { name: string; overview: string; about: string }
  sink: ResponseSink
  /** Controlled: the route owns the page so Ask can jump to the page it inserted. */
  page: number
  onPageChange: (index: number) => void
  rating: Rating | null
  ratingText: string
  onRate: (rating: Rating, text: string) => void
  onDone: () => void
  onClose: () => void
  /** Sends the activity, rating and note to the developers (D18). */
  onShare: (comment: string) => void
  shareState: 'idle' | 'pending' | 'done' | 'error'
  /** The Ask button (G7); absent until an activity is generated. */
  onAsk?: () => void
  /** Rendered under the page — the Ask sheet and its states live above the player. */
  overlay?: React.ReactNode
}

export function ActivityPlayer({
  doc,
  goalTitle,
  streaming = false,
  waitLabel,
  libraryItem,
  sink,
  page: requested,
  onPageChange,
  rating,
  ratingText,
  onRate,
  onDone,
  onClose,
  onShare,
  shareState,
  onAsk,
  overlay,
}: PlayerProps) {
  const { t } = useTranslation()
  const wait = waitLabel ?? t('player.wait.writing')
  // Clamped, never stored: pages arrive while G5b streams, so the page we show
  // is always one that exists yet.
  const index = Math.max(0, Math.min(requested, doc.pages.length - 1))
  const scroller = useRef<ScrollView>(null)
  const page: Page | undefined = doc.pages[index]

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, doc.pages.length - 1))
      onPageChange(clamped)
      scroller.current?.scrollTo({ y: 0, animated: false })
    },
    [doc.pages.length, onPageChange],
  )

  const isSummary = page?.kind === 'summary'
  const reduceMotion = useReduceMotion()
  const celebration = isSummary && reduceMotion === false ? CELEBRATION_BY_TIER[doc.tier] : null
  const atEnd = index >= doc.pages.length - 1

  const content = useMemo(() => {
    if (!page) {
      return streaming ? (
        <WaitCover
          title={doc.title}
          goalTitle={goalTitle}
          estMinutes={doc.estMinutes}
          item={libraryItem}
          label={wait}
        />
      ) : null
    }
    if (page.kind === 'review' && page.blocks === null) {
      return <Generating label={t('player.review.working')} />
    }
    return (
      <View className="gap-5">
        {page.kind === 'summary' ? (
          <SummaryHeader celebrationKey={doc.title} tier={doc.tier} goalTitle={goalTitle} />
        ) : null}
        {page.kind === 'inserted' && page.question ? (
          <AskedHeader question={page.question} />
        ) : null}
        {(page.blocks ?? []).map((block, i) => (
          <BlockView key={`${page.id}-${i}`} pageId={page.id} block={block} />
        ))}
      </View>
    )
  }, [doc.estMinutes, doc.tier, doc.title, goalTitle, libraryItem, page, streaming, t, wait])

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right', 'bottom']}>
      {/* Around the navigation too: Continue reads the page's answers. */}
      <ResponsesProvider sink={sink}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center gap-3 px-5 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('player.close')}
              onPress={onClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={colors.ink.soft} />
            </Pressable>
            <View className="flex-1">
              <ProgressBar
                total={doc.pages.length}
                current={index}
                celebrateMs={celebration === 'bar' ? CELEBRATION_MS.bar : undefined}
              />
            </View>
          </View>

          {/* The summary is the one page that gets washes, at its edges (docs/07),
            and the one that celebrates arriving. */}
          {/* Held until Reduce Motion is known, so a bloom never starts as a still. */}
          {isSummary && reduceMotion !== null ? (
            <SummaryWashes bloom={celebration === 'bloom'} />
          ) : null}
          {celebration === 'bar' ? <Sunlight /> : null}
          {celebration === 'dots' ? <RisingDots /> : null}

          <AskProvider value={onAsk ?? null}>
            <ScrollView
              ref={scroller}
              className="flex-1"
              contentContainerClassName="grow gap-5 px-5 pb-8 pt-6"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <FadeIn key={page?.id ?? index}>{content}</FadeIn>
              {isSummary ? (
                <SummaryFooter
                  doc={doc}
                  libraryItem={libraryItem}
                  rating={rating}
                  ratingText={ratingText}
                  onRate={onRate}
                  onShare={onShare}
                  shareState={shareState}
                />
              ) : null}
            </ScrollView>
          </AskProvider>

          <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('player.back')}
              disabled={index === 0}
              onPress={() => go(index - 1)}
              className={`h-11 w-11 items-center justify-center rounded-pill border border-hairline ${
                index === 0 ? 'opacity-30' : 'active:bg-cornflower-tint'
              }`}
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink.DEFAULT} />
            </Pressable>
            <View className="flex-1">
              {isSummary ? (
                <Button testID="player-done" label={t('common.done')} onPress={onDone} />
              ) : (
                <ContinueButton
                  page={page}
                  label={
                    page && streaming && atEnd
                      ? t('player.writingPage', { page: doc.pages.length + 1 })
                      : t('common.continue')
                  }
                  disabled={streaming && atEnd}
                  onPress={() => go(index + 1)}
                />
              )}
            </View>
            {/* Ask sits with the navigation, in reach of a thumb — it's available
              on every page, not a header affordance (docs/05). */}
            {onAsk ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('player.ask.label')}
                onPress={onAsk}
                className="h-11 w-11 items-center justify-center rounded-pill border border-hairline active:bg-cornflower-tint"
              >
                <Ionicons name="chatbubble-outline" size={22} color={colors.cornflower.deep} />
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </ResponsesProvider>
      {overlay}
    </SafeAreaView>
  )
}

/** Held while an answer on the page is too long to send to the review. */
function ContinueButton({
  page,
  label,
  disabled,
  onPress,
}: {
  page: Page | undefined
  label: string
  disabled: boolean
  onPress: () => void
}) {
  const tooLong = usePageTooLong(page)
  return (
    <Button
      testID="player-continue"
      label={label}
      disabled={disabled || tooLong}
      onPress={onPress}
    />
  )
}
