import type { PageStatePayload } from '../../types/messages'
import { getConversationIdFromPathname } from './conversation'

/**
 * Extract task candidate strings from list items in a message element.
 */
function getTaskCandidatesFromMessage(messageEl: HTMLElement): string[] {
  const items = Array.from(messageEl.querySelectorAll('li'))
  const candidates: string[] = []
  for (const li of items) {
    const text = li.textContent?.trim()
    if (text) candidates.push(text)
  }
  return candidates
}

/**
 * Get latest assistant message text from markdown blocks or fallback to full text.
 */
function getLatestMessageText(messageEl: HTMLElement): string {
  const markdownBlocks = Array.from(messageEl.querySelectorAll('.markdown')) as HTMLElement[]
  if (markdownBlocks.length > 0) {
    const parts = markdownBlocks.map((el) => el.textContent?.trim() ?? '').filter(Boolean)
    return parts.join('\n')
  }
  return messageEl.textContent?.trim() ?? ''
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
 * Extract page state: conversationId from URL, latest assistant message from DOM.
 * When multiple assistant responses exist, uses the single selected/visible one if unambiguous; otherwise sets ambiguousResponseVersions.
 */
export function extractLatestAssistantMessage(): PageStatePayload {
  const conversationId = getConversationIdFromPathname(window.location.pathname)
  const supported = conversationId !== null

  const assistantMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]')) as HTMLElement[]
  const withContent: { el: HTMLElement; text: string; candidates: string[] }[] = []
  for (const el of assistantMessages) {
    const candidates = getTaskCandidatesFromMessage(el)
    const text = getLatestMessageText(el)
    if (candidates.length > 0 || text.length > 0) {
      withContent.push({ el, text, candidates })
    }
  }

  let latestMessageText: string | null = null
  let taskCandidates: string[] = []
  let chosenEl: HTMLElement | null = null
  let ambiguousResponseVersions = false

  if (withContent.length === 0 && supported && assistantMessages.length > 0) {
    const last = assistantMessages[assistantMessages.length - 1]
    latestMessageText = getLatestMessageText(last)
    taskCandidates = getTaskCandidatesFromMessage(last)
    chosenEl = last
  } else if (withContent.length === 1) {
    const one = withContent[0]
    latestMessageText = one.text
    taskCandidates = one.candidates
    chosenEl = one.el
  } else if (withContent.length > 1) {
    const visible = withContent.filter((w) => isVisible(w.el))
    const selected = withContent.filter((w) => isSelectedOrActive(w.el))
    if (visible.length === 1) {
      const one = visible[0]
      latestMessageText = one.text
      taskCandidates = one.candidates
      chosenEl = one.el
    } else if (selected.length === 1) {
      const one = selected[0]
      latestMessageText = one.text
      taskCandidates = one.candidates
      chosenEl = one.el
    } else {
      ambiguousResponseVersions = true
    }
  }

  const isGenerating = isLatestMessageStillGenerating(chosenEl)

  return {
    conversationId,
    supported,
    latestMessageText,
    taskCandidates,
    isGenerating,
    ...(ambiguousResponseVersions ? { ambiguousResponseVersions: true } : {}),
  }
}
