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

/** Strip leading markdown-style markers from the first line only; keep following paragraphs. */
function parseDomListItemText(fullText: string): ParsedItem | null {
  const trimmed = fullText.trim()
  if (!trimmed) return null
  const lines = trimmed.split(/\r?\n/)
  let i = 0
  while (i < lines.length && !lines[i]?.trim()) i++
  if (i >= lines.length) return null

  const head = parseOneLine(lines[i]!.trim())
  if (!head) return null
  const tail = lines.slice(i + 1).join('\n').trim()
  const text = tail ? `${head.text}\n${tail}`.trim() : head.text
  if (!text) return null
  return { text, checked: head.checked }
}

/**
 * Parse native HTML list rows (full `li` text, no markdown prefixes).
 * Dedupes by normalized text; preserves order of first occurrence.
 */
export function parseChecklistFromHtmlListItems(
  rows: HtmlListItemPayload[],
  normalize: (raw: string) => string,
): ParsedMessage {
  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const structureKinds: Array<'ordered' | 'unordered'> = []
  for (const row of rows) {
    const text = row.text.trim()
    if (!text) continue
    const item = parseDomListItemText(text)
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
 * Parse text into list items. Uses line-based parsing; keeps only lines that
 * look like bullets, numbered items, or markdown checkboxes. Dedupes by
 * normalized text (exact duplicate normalized items kept once).
 * Source structure is inferred from every list-looking line (before dedupe).
 *
 * Also: skips leading intro prose before the first list block; treats
 * emoji-prefixed numbered headings as section containers for following action lines.
 */
export function parseChecklistFromText(
  text: string,
  normalize: (raw: string) => string,
): ParsedMessage {
  const rawLines = text.split(/\r?\n/)
  const start = introStartIndex(rawLines)
  const lines = rawLines.slice(start)

  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const lineKinds: ListLineKind[] = []

  let sectionTitle: string | null = null
  let blankRun = 0

  const appendDeduped = (item: ParsedItem) => {
    const key = normalize(item.text)
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(item)
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? ''
    const trimmed = line.trim()
    if (!trimmed) {
      blankRun++
      if (sectionTitle && blankRun >= 2) sectionTitle = null
      continue
    }
    blankRun = 0

    const headingTitle = matchEmojiSectionHeading(line)
    if (headingTitle) {
      sectionTitle = headingTitle
      continue
    }

    if (sectionTitle) {
      const child = parseSectionChildLine(line, sectionTitle)
      if (child) {
        lineKinds.push(isListLine(line) ? classifyListLine(line) : 'bullet')
        appendDeduped(child)
        continue
      }
      sectionTitle = null
    }

    if (!isListLine(line)) continue
    lineKinds.push(classifyListLine(line))
    const item = parseOneLine(line)
    if (!item) continue
    appendDeduped(item)
  }

  return { items: result, sourceStructure: inferSourceStructureFromLineKinds(lineKinds) }
}

function parseSectionChildLine(line: string, sectionTitle: string): ParsedItem | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  if (isListLine(line)) {
    const parsed = parseOneLine(trimmed)
    if (!parsed) return null
    return { text: `${sectionTitle} — ${parsed.text}`, checked: parsed.checked }
  }
  if (isIndentedContinuation(line)) {
    return { text: `${sectionTitle} — ${trimmed}`, checked: false }
  }
  return null
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
