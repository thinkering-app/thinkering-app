import { fetch } from 'expo/fetch'
import type { ResourceDescribeOutput, ResourceDescribeParams } from '@thinkering/core'
import { goalIdsForTitles, listGoals, type Interest } from '@thinkering/db'

import { callAi, getAiMode, signedHeaders, API_BASE_URL } from '@/ai'
import { db } from '@/db'

/**
 * Add-by-link (docs/01 §5): the proxy fetches the page — the app has no
 * business parsing arbitrary HTML, and the URL guards belong on the server —
 * and G10 drafts the fields the learner then edits.
 */

export interface PageFetch {
  url: string
  title?: string
  text: string
}

export interface ResourceDraft extends ResourceDescribeOutput {
  url: string
  goalIds: string[]
}

export class LinkError extends Error {}

/** Fixture mode has no proxy; a canned page keeps the whole flow runnable offline. */
const FIXTURE_PAGE: Omit<PageFetch, 'url'> = {
  title: "Nico's Weg – A1 | Learn German | DW",
  text: "Nico's Weg is a free German course from Deutsche Welle, told as a video story. Each episode is two to four minutes and is followed by exercises on the vocabulary and structures it used.",
}

export async function fetchPage(url: string, signal?: AbortSignal): Promise<PageFetch> {
  if (getAiMode() === 'fixture') return { url, ...FIXTURE_PAGE }

  const body = JSON.stringify({ url })
  const res = await fetch(`${API_BASE_URL}/api/fetch-url`, {
    method: 'POST',
    headers: await signedHeaders(body),
    body,
    signal: signal ?? null,
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new LinkError(
      payload.error === 'blocked'
        ? "That link doesn't look like a public page."
        : payload.error === 'unreadable'
          ? "We couldn't read that page."
          : "We couldn't reach that link.",
    )
  }
  return (await res.json()) as PageFetch
}

/** Fetches the page and drafts its fields. The draft is editable before saving. */
export async function draftResource(
  interest: Interest,
  url: string,
  signal?: AbortSignal,
): Promise<ResourceDraft> {
  const page = await fetchPage(url, signal)
  const goals = listGoals(db, interest.id)
  const params: ResourceDescribeParams = {
    url: page.url,
    pageTitle: page.title,
    pageText: page.text,
    interestName: interest.name,
    wantToLearn: interest.wantToLearn,
    goalTitles: goals.map((g) => g.title),
  }
  const { output } = await callAi<ResourceDescribeOutput>('resource.describe', params, {
    interestId: interest.id,
    signal,
  })
  return {
    ...output,
    url: page.url,
    goalIds: goalIdsForTitles(db, interest.id, output.goalTitles),
  }
}

/** `https://www.dw.com/en/x` → `dw.com`, for the line under a resource title. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * When two resources are the same one. Used to keep a search from saving a
 * URL the learner already has: a model told not to return them can still do
 * it, and nothing below this point would notice.
 */
export function sameResourceKey(url: string): string {
  const normalized = normalizeUrl(url) ?? url.trim()
  return normalized.replace(/\/+$/, '').toLowerCase()
}

/** Accepts what people actually paste, including a bare domain. */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return url.hostname.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}
