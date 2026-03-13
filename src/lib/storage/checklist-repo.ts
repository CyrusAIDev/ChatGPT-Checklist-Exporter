import type { ChecklistRecord } from '../../types/checklist'
import { checklistKey } from './storage-keys'
import { validateChecklistRecord } from './storage-guards'

export async function getChecklist(conversationId: string): Promise<ChecklistRecord | null> {
  const key = checklistKey(conversationId)
  const out = await chrome.storage.local.get(key)
  const raw = out[key]
  return validateChecklistRecord(raw)
}

export async function setChecklist(record: ChecklistRecord): Promise<void> {
  const key = checklistKey(record.conversationId)
  await chrome.storage.local.set({ [key]: record })
}

export async function deleteChecklist(conversationId: string): Promise<void> {
  const key = checklistKey(conversationId)
  await chrome.storage.local.remove(key)
}
