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
 * Extract page state: conversationId from URL, latest assistant message from DOM.
 */
export function extractLatestAssistantMessage(): PageStatePayload {
  const conversationId = getConversationIdFromPathname(window.location.pathname)
  const supported = conversationId !== null

  let latestMessageText: string | null = null
  let taskCandidates: string[] = []

  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]')
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    const el = assistantMessages[i] as HTMLElement
    const candidates = getTaskCandidatesFromMessage(el)
    const text = getLatestMessageText(el)
    if (candidates.length > 0 || text.length > 0) {
      latestMessageText = text
      taskCandidates = candidates
      break
    }
  }

  if (supported && !latestMessageText && assistantMessages.length > 0) {
    const last = assistantMessages[assistantMessages.length - 1] as HTMLElement
    latestMessageText = getLatestMessageText(last)
    taskCandidates = getTaskCandidatesFromMessage(last)
  }

  return {
    conversationId,
    supported,
    latestMessageText,
    taskCandidates,
  }
}
