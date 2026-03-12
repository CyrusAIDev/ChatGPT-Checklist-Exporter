import type { ChecklistItem, ChecklistRecord } from '../../types/checklist'

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
  return {
    version: 1,
    conversationId: o.conversationId as string,
    sourceFingerprint: o.sourceFingerprint === null || typeof o.sourceFingerprint === 'string' ? o.sourceFingerprint : null,
    updatedAt: o.updatedAt as number,
    items,
  }
}
