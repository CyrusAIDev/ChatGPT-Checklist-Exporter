import type { ChecklistGroup, ChecklistRecord } from '../types/checklist'
import { getChecklist } from './storage/checklist-repo'
import { checklistKey } from './storage/storage-keys'

function isChecklistGroup(raw: unknown): raw is ChecklistGroup {
  if (raw == null || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.collapsed === 'boolean' &&
    typeof o.order === 'number' &&
    (o.parentId === undefined || typeof o.parentId === 'string')
  )
}

/**
 * getChecklist + groups. The storage validator (never-touch) rebuilds records
 * field-by-field and predates the groups feature, so it silently drops the
 * groups array on every read — organized lists flatten after any reload.
 * This wrapper re-reads the raw stored value and re-attaches validated groups.
 */
export async function getChecklistWithGroups(
  conversationId: string,
): Promise<ChecklistRecord | null> {
  const record = await getChecklist(conversationId)
  if (!record) return null
  const key = checklistKey(conversationId)
  const out = await chrome.storage.local.get(key)
  const raw = out[key] as { groups?: unknown } | undefined
  if (raw && Array.isArray(raw.groups)) {
    const groups = raw.groups.filter(isChecklistGroup)
    if (groups.length > 0) return { ...record, groups }
  }
  return record
}
