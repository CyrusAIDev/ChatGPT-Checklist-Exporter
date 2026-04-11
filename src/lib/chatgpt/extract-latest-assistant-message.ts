import type { HtmlListItemPayload, PageStatePayload } from '../../types/messages'
import {
  chooseAssistantSource,
  type AssistantSourceCandidate,
} from './choose-assistant-source'
import { getConversationIdFromPathname } from './conversation'

/**
 * Top-level `li` nodes under `ol`/`ul` only, excluding `li` nested inside another matched `li`
 * (avoids duplicating a parent step and its nested sub-bullets).
 */
function collectOutermostDirectListItems(root: HTMLElement): HTMLLIElement[] {
  const all = Array.from(root.querySelectorAll('ol > li, ul > li')) as HTMLLIElement[]
  return all.filter((li) => !all.some((other) => other !== li && other.contains(li)))
}

/**
 * Extract the li's own text, excluding content from nested ol/ul elements.
 * Prevents nested sub-bullet text from being smashed into the parent item.
 */
function getListItemOwnText(li: HTMLLIElement): string {
  const clone = li.cloneNode(true) as HTMLLIElement
  for (const nested of Array.from(clone.querySelectorAll('ol, ul'))) {
    nested.remove()
  }
  return clone.innerText?.trim() ?? ''
}

/**
 * Native ordered/unordered list rows: own `li` text (without nested list content)
 * plus nested list text as a paragraph-separated supporting body.
 */
function extractHtmlListItemsFromMessage(messageEl: HTMLElement): HtmlListItemPayload[] {
  const lis = collectOutermostDirectListItems(messageEl)
  const out: HtmlListItemPayload[] = []
  for (const li of lis) {
    const ownText = getListItemOwnText(li)
    if (!ownText) continue

    const nestedListEls = Array.from(li.querySelectorAll('ol, ul')) as HTMLElement[]
    const outermost = nestedListEls.filter(
      (nl) => !nestedListEls.some((other) => other !== nl && other.contains(nl)),
    )
    const nestedText = outermost
      .map((nl) => nl.innerText?.trim())
      .filter(Boolean)
      .join('\n')
    const text = nestedText ? `${ownText}\n\n${nestedText}` : ownText

    const parent = li.parentElement
    const listKind: 'ordered' | 'unordered' =
      parent?.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered'
    out.push({ text, listKind })
  }
  return out
}

/** Plain-text rows for logging / legacy shape; same order as `htmlListItems`. */
function listItemTextsForPayload(htmlListItems: HtmlListItemPayload[]): string[] {
  return htmlListItems.map((r) => r.text)
}

/**
 * Get latest assistant message text from markdown blocks or fallback to full text.
 * Uses innerText so fenced / code-style blocks keep line breaks; appends standalone
 * <pre> bodies when they look like task lists (GFM checkboxes, bullets, numbers).
 */
function getLatestMessageText(messageEl: HTMLElement): string {
  const markdownBlocks = Array.from(messageEl.querySelectorAll('.markdown')) as HTMLElement[]
  const parts: string[] = []
  if (markdownBlocks.length > 0) {
    for (const el of markdownBlocks) {
      const t = el.innerText?.trim() ?? ''
      if (t) parts.push(t)
    }
    const pres = Array.from(messageEl.querySelectorAll('pre')) as HTMLElement[]
    for (const pre of pres) {
      if (markdownBlocks.some((md) => md.contains(pre))) continue
      const t = pre.innerText?.trim() ?? ''
      if (t.length < 12) continue
      if (/^\s*[-*]\s+\[[\sx]\]/im.test(t) || /^\s*[-*•]\s+\S/m.test(t) || /^\s*\d+[.)]\s+/m.test(t)) {
        parts.push(t)
      }
    }
  } else {
    const t = messageEl.innerText?.trim() ?? ''
    if (t) parts.push(t)
  }
  return parts.join('\n\n')
}

/**
 * Detect if the latest assistant message is still streaming/generating.
 * Conservative: only true when we see a clear streaming indicator in the DOM.
 */
function isLatestMessageStillGenerating(lastAssistantMessage: HTMLElement | null): boolean {
  if (!lastAssistantMessage) return false
  const root = lastAssistantMessage.closest('article') ?? lastAssistantMessage
  const hasStreamingClass =
    root.classList.toString().toLowerCase().includes('streaming') ||
    root.querySelector('[class*="streaming"]') != null
  if (hasStreamingClass) return true
  const stopByTestId = document.querySelector('button[data-testid="stop-generating"]')
  if (stopByTestId) return true
  const stopByAria = Array.from(document.querySelectorAll('button')).some(
    (b) => b.getAttribute('aria-label')?.toLowerCase().includes('stop'),
  )
  if (stopByAria) return true
  const stopByText = Array.from(document.querySelectorAll('button')).some(
    (b) => b.textContent?.trim().toLowerCase().includes('stop'),
  )
  return stopByText
}

/** True if node or any ancestor has selected state (data-selected, aria-selected, or class selected/active). */
function isSelectedOrActive(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    if (node.getAttribute('data-selected') === 'true') return true
    if (node.getAttribute('aria-selected') === 'true') return true
    const cls = node.className?.toString().toLowerCase() ?? ''
    if (cls.includes('selected') || cls.includes('active')) return true
    node = node.parentElement
  }
  return false
}

/** True if element is visible (has height and not display:none). */
function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.height <= 0) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return true
}

/**
 * Same-turn grouping: assistant nodes inside the same <article> share a key.
 * One article per message → normal threads never share a key across turns.
 * Multiple bodies in one article (version UI) → same key, chooser can disambiguate by selected.
 */
function getTurnGroupKey(el: HTMLElement): string | null {
  const article = el.closest('article')
  if (!article) return null
  const articles = Array.from(document.querySelectorAll('article'))
  const idx = articles.indexOf(article as HTMLElement)
  return idx >= 0 ? `article:${idx}` : null
}

function assistantSourceDevLoggingEnabled(): boolean {
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as { env?: { DEV?: boolean } }).env
    if (env?.DEV === true) return true
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') return true
  return false
}

function previewText(s: string, max = 80): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

function conversationTitleFromDocument(): string | null {
  const t = document.title?.trim()
  if (!t) return null
  const cleaned = t.replace(/\s*[-·]\s*ChatGPT\s*$/i, '').trim()
  return cleaned.length > 0 ? cleaned : null
}

function logAssistantSourceDebug(
  rows: Array<{
    el: HTMLElement
    assistantDomIndex: number
    text: string
    visible: boolean
    selected: boolean
    turnGroupKey: string | null
  }>,
): void {
  if (!assistantSourceDevLoggingEnabled()) return
  const tail = rows.slice(-5)
  console.log('[Living Checklist] assistant source debug (last up to 5 contentful, DOM order):')
  for (const row of tail) {
    const rect = row.el.getBoundingClientRect()
    const article = row.el.closest('article')
    const articles = Array.from(document.querySelectorAll('article'))
    const artIdx = article ? articles.indexOf(article as HTMLElement) : -1
    const testIds: string[] = []
    let p: HTMLElement | null = row.el
    for (let d = 0; d < 6 && p; d++) {
      const tid = p.getAttribute('data-testid')
      if (tid) testIds.push(tid)
      p = p.parentElement
    }
    const cls = row.el.className?.toString().slice(0, 120) ?? ''
    console.log('[Living Checklist]', {
      assistantDomIndex: row.assistantDomIndex,
      preview: previewText(row.text),
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      visible: row.visible,
      selected: row.selected,
      turnGroupKey: row.turnGroupKey,
      articleIndex: artIdx,
      parentTestIds: testIds,
      elClassSnippet: cls,
    })
  }
}

type ContentfulRow = {
  el: HTMLElement
  assistantDomIndex: number
  text: string
  candidates: string[]
  htmlListItems: HtmlListItemPayload[]
}

/**
 * Extract page state: conversationId from URL, latest assistant message from DOM.
 * Uses pure chooser rules: default last contentful assistant; ambiguity only for
 * positively identified same-turn multi-body without a single selected winner.
 */
export function extractLatestAssistantMessage(): PageStatePayload {
  const conversationId = getConversationIdFromPathname(window.location.pathname)
  const supported = conversationId !== null

  const assistantMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]')) as HTMLElement[]

  const contentfulRows: ContentfulRow[] = []
  for (let i = 0; i < assistantMessages.length; i++) {
    const el = assistantMessages[i]
    const htmlListItems = extractHtmlListItemsFromMessage(el)
    const candidates = listItemTextsForPayload(htmlListItems)
    const text = getLatestMessageText(el)
    if (candidates.length > 0 || text.length > 0) {
      contentfulRows.push({ el, assistantDomIndex: i, text, candidates, htmlListItems })
    }
  }

  let latestMessageText: string | null = null
  let taskCandidates: string[] = []
  let htmlListItems: HtmlListItemPayload[] | undefined
  let chosenEl: HTMLElement | null = null
  let ambiguousResponseVersions = false

  if (contentfulRows.length === 0 && supported && assistantMessages.length > 0) {
    const last = assistantMessages[assistantMessages.length - 1]
    latestMessageText = getLatestMessageText(last)
    const html = extractHtmlListItemsFromMessage(last)
    htmlListItems = html.length > 0 ? html : undefined
    taskCandidates = listItemTextsForPayload(html)
    chosenEl = last
  } else if (contentfulRows.length >= 1) {
    const debugRows = contentfulRows.map((row) => ({
      el: row.el,
      assistantDomIndex: row.assistantDomIndex,
      text: row.text,
      visible: isVisible(row.el),
      selected: isSelectedOrActive(row.el),
      turnGroupKey: getTurnGroupKey(row.el),
    }))
    logAssistantSourceDebug(debugRows)

    const chooserInput: AssistantSourceCandidate[] = contentfulRows.map((row) => ({
      domIndex: row.assistantDomIndex,
      hasTextContent: true,
      visible: isVisible(row.el),
      selected: isSelectedOrActive(row.el),
      turnGroupKey: getTurnGroupKey(row.el),
    }))

    const choice = chooseAssistantSource(chooserInput)
    ambiguousResponseVersions = choice.ambiguousResponseVersions

    if (!ambiguousResponseVersions && choice.chosenCandidateIndex != null) {
      const picked = contentfulRows[choice.chosenCandidateIndex]
      if (picked) {
        latestMessageText = picked.text
        taskCandidates = picked.candidates
        htmlListItems = picked.htmlListItems.length > 0 ? picked.htmlListItems : undefined
        chosenEl = picked.el
      }
    }
  }

  const isGenerating = isLatestMessageStillGenerating(chosenEl)

  return {
    conversationId,
    supported,
    latestMessageText,
    taskCandidates,
    ...(htmlListItems != null && htmlListItems.length > 0 ? { htmlListItems } : {}),
    conversationTitle: conversationTitleFromDocument(),
    isGenerating,
    ...(ambiguousResponseVersions ? { ambiguousResponseVersions: true } : {}),
  }
}
