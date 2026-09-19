import { Text } from 'react-native'

/**
 * The inline markdown subset activity documents use (docs/05): bold, italic,
 * code. Deliberately not a markdown engine — anything else renders literally,
 * which is the right failure for generated content.
 */

interface Span {
  text: string
  style?: 'bold' | 'italic' | 'code'
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g

export function parseInline(md: string): Span[] {
  const spans: Span[] = []
  let last = 0
  for (const match of md.matchAll(TOKEN)) {
    const start = match.index
    if (start > last) spans.push({ text: md.slice(last, start) })
    const token = match[0]
    if (token.startsWith('**')) spans.push({ text: token.slice(2, -2), style: 'bold' })
    else if (token.startsWith('`')) spans.push({ text: token.slice(1, -1), style: 'code' })
    else spans.push({ text: token.slice(1, -1), style: 'italic' })
    last = start + token.length
  }
  if (last < md.length) spans.push({ text: md.slice(last) })
  return spans
}

const STYLE = {
  bold: 'font-sans-semibold',
  italic: 'italic',
  // No mono family in the design system — code reads as code through its tint.
  code: 'font-sans-medium bg-cornflower-tint',
} as const

export function Markdown({ md, className }: { md: string; className?: string }) {
  return (
    <Text className={className ?? 'font-sans text-body text-ink'}>
      {parseInline(md).map((span, i) => (
        <Text key={i} className={span.style ? STYLE[span.style] : undefined}>
          {span.text}
        </Text>
      ))}
    </Text>
  )
}

/**
 * The same markdown as one Text per word, for a wrapping row that mixes text
 * with inline inputs: a single Text can't wrap around a sibling view.
 */
export function MarkdownWords({ md }: { md: string }) {
  const words: Span[][] = []
  let word: Span[] = []
  for (const span of parseInline(md)) {
    for (const part of span.text.split(/(\s+)/)) {
      if (part.trim() === '') {
        if (part !== '' && word.length > 0) {
          words.push(word)
          word = []
        }
      } else {
        word.push({ text: part, style: span.style })
      }
    }
  }
  if (word.length > 0) words.push(word)

  return words.map((pieces, i) => (
    <Text key={i} className="font-sans text-body text-ink">
      {pieces.map((piece, j) => (
        <Text key={j} className={piece.style ? STYLE[piece.style] : undefined}>
          {piece.text}
        </Text>
      ))}{' '}
    </Text>
  ))
}
