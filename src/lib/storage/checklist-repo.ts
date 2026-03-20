import type { ChecklistRecord } from '../../types/checklist'
import { checklistKey, CHECKLIST_KEY_PREFIX } from './storage-keys'
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

/** All saved checklist records (library). Invalid entries are skipped. */
export async function listAllChecklists(): Promise<ChecklistRecord[]> {
  const all = await chrome.storage.local.get(null)
  const out: ChecklistRecord[] = []
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(CHECKLIST_KEY_PREFIX)) continue
    const rec = validateChecklistRecord(value)
    if (rec) out.push(rec)
  }
  return out
}
