import type { ChecklistItem, ChecklistRecord } from '../../types/checklist'
import { chatgptConversationUrl } from '../chatgpt/chat-url'

function isChecklistItem(raw: unknown): raw is ChecklistItem {
  if (raw == null || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.text === 'string' &&
    typeof o.checked === 'boolean' &&
    typeof o.archived === 'boolean' &&
    typeof o.order === 'number'
  )
}

/**
 * Validate stored value. Returns null if invalid (do not crash UI).
 */
export function validateChecklistRecord(raw: unknown): ChecklistRecord | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  if (typeof o.conversationId !== 'string' || !o.conversationId) return null
  if (typeof o.updatedAt !== 'number') return null
  if (!Array.isArray(o.items)) return null
  const items: ChecklistItem[] = []
  for (const entry of o.items) {
    if (!isChecklistItem(entry)) return null
    items.push(entry)
  }
  const conversationId = o.conversationId as string
  const updatedAt = o.updatedAt as number
  const createdAt = typeof o.createdAt === 'number' ? o.createdAt : updatedAt
  let sourceChatUrl: string
  if (typeof o.sourceChatUrl === 'string' && o.sourceChatUrl.trim().length > 0) {
    sourceChatUrl = o.sourceChatUrl.trim()
  } else {
    sourceChatUrl = chatgptConversationUrl(conversationId)
  }
  const conversationLabel =
    o.conversationLabel === null
      ? null
      : typeof o.conversationLabel === 'string'
        ? o.conversationLabel
        : null
  return {
    version: 1,
    conversationId,
    sourceFingerprint: o.sourceFingerprint === null || typeof o.sourceFingerprint === 'string' ? o.sourceFingerprint : null,
    updatedAt,
    createdAt,
    sourceChatUrl,
    conversationLabel,
    items,
  }
}
