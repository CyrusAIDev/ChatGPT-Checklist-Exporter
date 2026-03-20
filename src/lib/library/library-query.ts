import type { ChecklistRecord } from '../../types/checklist'

export type ChecklistProgressCounts = {
  activeTotal: number
  activeCompleted: number
  archivedTotal: number
}

export function checklistProgressCounts(record: ChecklistRecord): ChecklistProgressCounts {
  let activeTotal = 0
  let activeCompleted = 0
  let archivedTotal = 0
  for (const i of record.items) {
    if (i.archived) {
      archivedTotal++
    } else {
      activeTotal++
      if (i.checked) activeCompleted++
    }
  }
  return { activeTotal, activeCompleted, archivedTotal }
}

export function libraryDisplayTitle(record: ChecklistRecord): string {
  const label = record.conversationLabel?.trim()
  if (label) return label
  return `Conversation ${record.conversationId}`
}

export function sortChecklistsByUpdatedDesc(records: ChecklistRecord[]): ChecklistRecord[] {
  return [...records].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Filter by conversation label or any item text (active or archived). */
export function filterChecklistsByQuery(records: ChecklistRecord[], query: string): ChecklistRecord[] {
  const q = query.trim().toLowerCase()
  if (!q) return records
  return records.filter((r) => {
    if (libraryDisplayTitle(r).toLowerCase().includes(q)) return true
    if ((r.conversationLabel ?? '').toLowerCase().includes(q)) return true
    return r.items.some((i) => i.text.toLowerCase().includes(q))
  })
}
