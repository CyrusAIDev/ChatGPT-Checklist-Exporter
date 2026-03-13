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

/**
 * Extract page state: conversationId from URL, latest assistant message from DOM.
 */
export function extractLatestAssistantMessage(): PageStatePayload {
  const conversationId = getConversationIdFromPathname(window.location.pathname)
  const supported = conversationId !== null

  let latestMessageText: string | null = null
  let taskCandidates: string[] = []
  let lastAssistantEl: HTMLElement | null = null

  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]')
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    const el = assistantMessages[i] as HTMLElement
    const candidates = getTaskCandidatesFromMessage(el)
    const text = getLatestMessageText(el)
    if (candidates.length > 0 || text.length > 0) {
      latestMessageText = text
      taskCandidates = candidates
      lastAssistantEl = el
      break
    }
  }

  if (supported && !latestMessageText && assistantMessages.length > 0) {
    const last = assistantMessages[assistantMessages.length - 1] as HTMLElement
    latestMessageText = getLatestMessageText(last)
    taskCandidates = getTaskCandidatesFromMessage(last)
    lastAssistantEl = last
  }

  const isGenerating = isLatestMessageStillGenerating(lastAssistantEl)

  return {
    conversationId,
    supported,
    latestMessageText,
    taskCandidates,
    isGenerating,
  }
}
