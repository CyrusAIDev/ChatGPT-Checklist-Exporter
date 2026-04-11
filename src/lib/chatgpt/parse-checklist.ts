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

type ListLineKind = 'numbered' | 'bullet' | 'checkbox'

function isListLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (BULLET.test(t) || NUMBERED.test(t)) return true
  if (CHECKBOX_UNCHECKED.test(t) || CHECKBOX_CHECKED.test(t)) return true
  return false
}

function classifyListLine(line: string): ListLineKind {
  const t = line.trim()
  if (CHECKBOX_CHECKED.test(t) || CHECKBOX_UNCHECKED.test(t)) return 'checkbox'
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
 */
export function parseChecklistFromText(
  text: string,
  normalize: (raw: string) => string,
): ParsedMessage {
  const lines = text.split(/\r?\n/)
  const seen = new Set<string>()
  const result: ParsedItem[] = []
  const lineKinds: ListLineKind[] = []
  for (const line of lines) {
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
