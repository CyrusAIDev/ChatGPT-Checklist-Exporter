import type { ChecklistItem, ChecklistRecord, ChecklistSourceStructure } from '../../types/checklist'
import type { HtmlListItemPayload, PageStatePayload } from '../../types/messages'
import { chatgptConversationUrl } from './chat-url'
import { normalizeItemText } from './normalize-item'

/**
 * One parsed line: display text and whether it was checked in source ([x]).
 */
export type ParsedItem = { text: string; checked: boolean }

export type ParsedMessage = {
  items: ParsedItem[]
  sourceStructure: ChecklistSourceStructure
}

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/
const CHECKBOX_UNCHECKED = /^\s*\[\s?\]\s*/
const CHECKBOX_CHECKED = /^\s*\[x\]\s*/i
/** GFM task list: `- [ ] item`, `* [x] done` (must be detected before plain `- ` bullets). */
const MD_GFM_TASK = /^\s*[-*•]\s+\[\s*([xX]?)\s*\]\s*(.*)$/

/** Emoji-prefixed numbered section heading, e.g. `🧠 1. Validate the Idea`. */
const EMOJI_SECTION_HEADING =
  /^((?:\p{Extended_Pictographic}\uFE0F?\s*)+)(\d+[.)]\s+)(.+)$/u

type ListLineKind = 'numbered' | 'bullet' | 'checkbox'

function lineHasMdGfmTask(line: string): boolean {
  const t = line.trim()
  return MD_GFM_TASK.test(t)
}

function isListLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (lineHasMdGfmTask(line)) return true
  if (BULLET.test(t) || NUMBERED.test(t)) return true
  if (CHECKBOX_UNCHECKED.test(t) || CHECKBOX_CHECKED.test(t)) return true
  return false
}

function classifyListLine(line: string): ListLineKind {
  const t = line.trim()
  if (lineHasMdGfmTask(line) || CHECKBOX_CHECKED.test(t) || CHECKBOX_UNCHECKED.test(t)) return 'checkbox'
  if (NUMBERED.test(t)) return 'numbered'
  return 'bullet'
}

export function inferSourceStructureFromLineKinds(kinds: ListLineKind[]): ChecklistSourceStructure {
  if (kinds.length === 0) return 'unordered'
  if (kinds.every((k) => k === 'numbered')) return 'ordered'
  if (kinds.every((k) => k === 'checkbox')) return 'checkbox'
  if (kinds.every((k) => k === 'bullet')) return 'unordered'
  return 'mixed'
}

/** Minimum non-empty HTML list rows before treating DOM extraction as a checklist (avoids stray single bullets). */
const MIN_HTML_LIST_ITEMS = 2

export function inferSourceStructureFromDomListKinds(
  kinds: Array<'ordered' | 'unordered'>,
): ChecklistSourceStructure {
  if (kinds.length === 0) return 'unordered'
  if (kinds.every((k) => k === 'ordered')) return 'ordered'
  if (kinds.every((k) => k === 'unordered')) return 'unordered'
  return 'mixed'
}

function parseOneLine(line: string): ParsedItem | null {
  let text = line.trim()
  if (!text) return null
  let checked = false

  const mdTask = text.match(MD_GFM_TASK)
  if (mdTask) {
    checked = (mdTask[1] ?? '').toLowerCase() === 'x'
    text = (mdTask[2] ?? '').trim()
    if (!text) return null
    return { text, checked }
  }

  if (CHECKBOX_CHECKED.test(text)) {
    checked = true
    text = text.replace(CHECKBOX_CHECKED, '').trim()
  } else if (CHECKBOX_UNCHECKED.test(text)) {
    text = text.replace(CHECKBOX_UNCHECKED, '').trim()
  } else if (BULLET.test(text)) {
    text = text.replace(BULLET, '').trim()
  } else if (NUMBERED.test(text)) {
    text = text.replace(NUMBERED, '').trim()
  }
  if (!text) return null
  return { text, checked }
}

function matchEmojiSectionHeading(line: string): string | null {
  const t = line.trim()
  const m = t.match(EMOJI_SECTION_HEADING)
  if (!m || !m[3]) return null
  return m[3].trim()
}

/**
 * First list line that starts a strong block, or first list line after prose; drops leading intro.
 * Never slices away an emoji section heading that appears before the first list line.
 */
function introStartIndex(lines: string[]): number {
  const flags = lines.map((l) => isListLine(l))
  let skip = 0
  let foundPair = false
  outer: for (let i = 0; i < lines.length; i++) {
    if (!flags[i]) continue
    for (let j = i + 1; j < lines.length && j <= i + 14; j++) {
      if (flags[j]) {
        skip = i
        foundPair = true
        break outer
      }
    }
  }
  if (!foundPair) {
    let first = -1
    for (let i = 0; i < flags.length; i++) {
      if (flags[i]) {
        first = i
        break
      }
    }
    skip = first > 0 ? first : 0
  }
  for (let k = 0; k < skip && k < lines.length; k++) {
    if (matchEmojiSectionHeading(lines[k] ?? '')) return k
  }
  return skip
}

function isIndentedContinuation(line: string): boolean {
  return /^\s{2,}\S/.test(line)
}

/** Strip leading markdown-style markers from the first line; preserve paragraph breaks. */
function parseDomListItemText(fullText: string): ParsedItem | null {
  const trimmed = fullText.trim()
  if (!trimmed) return null

  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim())
  if (paragraphs.length === 0) return null

  const firstPara = paragraphs[0]!
  const firstLineEnd = firstPara.indexOf('\n')
  const firstLine = (firstLineEnd >= 0 ? firstPara.slice(0, firstLineEnd) : firstPara).trim()

  const head = parseOneLine(firstLine)
  if (!head) return null

  const restOfFirst = firstLineEnd >= 0 ? firstPara.slice(firstLineEnd + 1).trim() : ''
  const remainingParagraphs = paragraphs.slice(1).join('\n\n').trim()

  let text = head.text
  if (restOfFirst) text += '\n' + restOfFirst
  if (remainingParagraphs) text += '\n\n' + remainingParagraphs

  text = text.trim()
  if (!text) return null
  return { text, checked: head.checked }
}

/**
 * When rows have a strong ordered structure, group trailing unordered items
 * as supporting text under the preceding ordered item.
 */
function parseOrderedHtmlListItems(
  rows: HtmlListItemPayload[],
  normalize: (raw: string) => string,
): ParsedMessage {
  const seen = new Set<string>()
  const result: ParsedItem[] = []

  let currentItem: ParsedItem | null = null
  const supportingLines: string[] = []

  const flush = () => {
    if (!currentItem) return
    const bodyText = supportingLines.join('\n').trim()
    const finalItem: ParsedItem = bodyText
      ? { text: `${currentItem.text}\n\n${bodyText}`, checked: currentItem.checked }
      : currentItem
    const key = normalize(finalItem.text)
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(finalItem)
    }
    currentItem = null
    supportingLines.length = 0
  }

  for (const row of rows) {
    const text = row.text.trim()
    if (!text) continue
    if (row.listKind === 'ordered') {
      flush()
      currentItem = parseDomListItemText(text)
    } else if (currentItem) {
      const parsed = parseDomListItemText(text)
      if (parsed) supportingLines.push(parsed.text)
    } else {
      const parsed = parseDomListItemText(text)
      if (parsed) {
        const key = normalize(parsed.text)
        if (key && !seen.has(key)) {
          seen.add(key)
          result.push(parsed)
        }
      }
    }
  }
  flush()

  return { items: result, sourceStructure: 'ordered' }
}

/**
 * Parse native HTML list rows (full `li` text, no markdown prefixes).
 * Dedupes by normalized text; preserves order of first occurrence.
 * When a strong ordered structure is detected, groups unordered children
 * under their preceding ordered parent.
 */
export function parseChecklistFromHtmlListItems(
  rows: HtmlListItemPayload[],
  normalize: (raw: string) => string,
): ParsedMessage {
  const live = rows.filter((r) => r.text.trim().length > 0)
  const orderedCount = live.filter((r) => r.listKind === 'ordered').length

  if (orderedCount >= 2) {
    return parseOrderedHtmlListItems(live, normalize)
  }

  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const structureKinds: Array<'ordered' | 'unordered'> = []
  for (const row of live) {
    const item = parseDomListItemText(row.text)
    if (!item) continue
    const key = normalize(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    structureKinds.push(row.listKind)
    result.push(item)
  }
  return {
    items: result,
    sourceStructure: inferSourceStructureFromDomListKinds(structureKinds),
  }
}

/**
 * When the text has a strong ordered structure (top-level numbered lines or
 * emoji section headings), group child/body lines under each parent step.
 */
function parseOrderedTextWithGrouping(
  lines: string[],
  normalize: (raw: string) => string,
): ParsedMessage {
  const seen = new Set<string>()
  const result: ParsedItem[] = []

  let currentHead: ParsedItem | null = null
  const bodyLines: string[] = []

  const flush = () => {
    if (!currentHead) return
    const bodyText = bodyLines
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n')
      .trim()
    const finalItem: ParsedItem = bodyText
      ? { text: `${currentHead.text}\n\n${bodyText}`, checked: currentHead.checked }
      : currentHead
    const key = normalize(finalItem.text)
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(finalItem)
    }
    currentHead = null
    bodyLines.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const headingTitle = matchEmojiSectionHeading(line)
    if (headingTitle) {
      flush()
      currentHead = { text: headingTitle, checked: false }
      continue
    }

    if (NUMBERED.test(trimmed) && !isIndentedContinuation(line)) {
      flush()
      currentHead = parseOneLine(trimmed)
      continue
    }

    if (currentHead) {
      const bodyItem = parseOneLine(trimmed)
      if (bodyItem) {
        bodyLines.push(bodyItem.text)
      } else if (isIndentedContinuation(line)) {
        bodyLines.push(trimmed)
      }
      continue
    }

    if (isListLine(line)) {
      const item = parseOneLine(trimmed)
      if (item) {
        const key = normalize(item.text)
        if (key && !seen.has(key)) {
          seen.add(key)
          result.push(item)
        }
      }
    }
  }
  flush()

  return { items: result, sourceStructure: 'ordered' }
}

/**
 * Parse text into list items. Uses line-based parsing; keeps only lines that
 * look like bullets, numbered items, or markdown checkboxes. Dedupes by
 * normalized text (exact duplicate normalized items kept once).
 * Source structure is inferred from every list-looking line (before dedupe).
 *
 * Also: skips leading intro prose before the first list block; when a strong
 * ordered structure is detected (numbered lines or emoji section headings),
 * groups child lines under each parent step.
 */
export function parseChecklistFromText(
  text: string,
  normalize: (raw: string) => string,
): ParsedMessage {
  const rawLines = text.split(/\r?\n/)
  const start = introStartIndex(rawLines)
  const lines = rawLines.slice(start)

  const topLevelNumbered = lines.filter((l) => {
    const t = l.trim()
    return NUMBERED.test(t) && !isIndentedContinuation(l)
  }).length
  const emojiSections = lines.filter((l) => matchEmojiSectionHeading(l) !== null).length

  if (topLevelNumbered >= 2 || emojiSections >= 1) {
    return parseOrderedTextWithGrouping(lines, normalize)
  }

  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const lineKinds: ListLineKind[] = []

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? ''
    const trimmed = line.trim()
    if (!trimmed) continue

    if (!isListLine(line)) continue
    lineKinds.push(classifyListLine(line))
    const item = parseOneLine(line)
    if (!item) continue
    const key = normalize(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return { items: result, sourceStructure: inferSourceStructureFromLineKinds(lineKinds) }
}

/**
 * Parse DOM-derived task candidates (already plain text) into items.
 * Dedupes by normalized text. Structure from each candidate’s list prefix.
 */
export function parseChecklistFromCandidates(
  candidates: string[],
  normalize: (raw: string) => string,
): ParsedMessage {
  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const lineKinds: ListLineKind[] = []
  for (const raw of candidates) {
    if (!isListLine(raw)) continue
    lineKinds.push(classifyListLine(raw))
    const item = parseOneLine(raw)
    if (!item) continue
    const key = normalize(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return { items: result, sourceStructure: inferSourceStructureFromLineKinds(lineKinds) }
}

/**
 * DOM-first, then text fallback. Returns parsed items and inferred source list shape.
 */
export function parseLatestMessage(payload: PageStatePayload): ParsedMessage {
  const htmlRows = (payload.htmlListItems ?? []).filter((r) => r.text.trim().length > 0)
  if (htmlRows.length >= MIN_HTML_LIST_ITEMS) {
    const fromHtml = parseChecklistFromHtmlListItems(htmlRows, normalizeItemText)
    if (fromHtml.items.length > 0) return fromHtml
  }
  if (payload.taskCandidates.length > 0) {
    return parseChecklistFromCandidates(payload.taskCandidates, normalizeItemText)
  }
  if (payload.latestMessageText) {
    return parseChecklistFromText(payload.latestMessageText, normalizeItemText)
  }
  return { items: [], sourceStructure: 'unordered' }
}

/** Order-preserving fingerprint so merge no-op matches create. */
function simpleFingerprint(items: ParsedItem[]): string {
  return items.map((i) => normalizeItemText(i.text)).join('\n')
}

function toChecklistItem(parsed: ParsedItem, order: number): ChecklistItem {
  return {
    id: crypto.randomUUID(),
    text: parsed.text,
    checked: parsed.checked,
    archived: false,
    order,
  }
}

export type NewChecklistMeta = {
  sourceChatUrl: string
  conversationLabel: string | null
  createdAt?: number
  sourceStructure?: ChecklistSourceStructure
}

/**
 * Create a new checklist record from parsed items.
 */
export function createChecklistRecord(
  conversationId: string,
  parsedItems: ParsedItem[],
  meta?: NewChecklistMeta,
): ChecklistRecord {
  const now = Date.now()
  const items: ChecklistItem[] = parsedItems.map((p, i) => toChecklistItem(p, i))
  const sourceFingerprint = parsedItems.length > 0 ? simpleFingerprint(parsedItems) : null
  const sourceChatUrl = meta?.sourceChatUrl ?? chatgptConversationUrl(conversationId)
  const sourceStructure = meta?.sourceStructure ?? 'unordered'
  return {
    version: 1,
    conversationId,
    sourceFingerprint,
    updatedAt: now,
    createdAt: meta?.createdAt ?? now,
    sourceChatUrl,
    conversationLabel: meta?.conversationLabel ?? null,
    sourceStructure,
    items,
  }
}
