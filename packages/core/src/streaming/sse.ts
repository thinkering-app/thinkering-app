/**
 * Incremental SSE parsing for the proxy's `/api/ai` stream (and Anthropic's
 * own SSE in BYO-key mode — same wire format). Pure: feed it decoded chunks,
 * it emits complete events.
 */

export interface SseEvent {
  event: string
  data: string
}

export class SseParser {
  private buffer = ''

  /** Feed a decoded chunk; returns any events completed by it. */
  push(chunk: string): SseEvent[] {
    this.buffer += chunk
    const events: SseEvent[] = []
    let boundary: number
    while ((boundary = this.buffer.indexOf('\n\n')) !== -1) {
      const raw = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      let event = 'message'
      const dataLines: string[] = []
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
    }
    return events
  }
}

/**
 * Accumulates Anthropic message-stream events (as JSON-parsed objects) into
 * the concatenated output text plus usage. Works on the raw event shapes the
 * proxy passes through.
 */
export interface StreamAccumulator {
  text: string
  inputTokens: number
  outputTokens: number
  done: boolean
  stopReason: string | null
}

export function emptyAccumulator(): StreamAccumulator {
  return { text: '', inputTokens: 0, outputTokens: 0, done: false, stopReason: null }
}

export function accumulateEvent(acc: StreamAccumulator, eventType: string, data: unknown): StreamAccumulator {
  const d = data as {
    message?: { usage?: { input_tokens?: number } }
    delta?: { type?: string; text?: string; stop_reason?: string }
    usage?: { output_tokens?: number }
  }
  switch (eventType) {
    case 'message_start':
      return { ...acc, inputTokens: d.message?.usage?.input_tokens ?? acc.inputTokens }
    case 'content_block_delta':
      return d.delta?.type === 'text_delta' && typeof d.delta.text === 'string'
        ? { ...acc, text: acc.text + d.delta.text }
        : acc
    case 'message_delta':
      return {
        ...acc,
        outputTokens: d.usage?.output_tokens ?? acc.outputTokens,
        stopReason: d.delta?.stop_reason ?? acc.stopReason,
      }
    case 'message_stop':
    case 'done':
      return { ...acc, done: true }
    default:
      return acc
  }
}
