import type { ChecklistItem, ChecklistRecord } from '../../types/checklist'
import { normalizeItemText } from '../chatgpt/normalize-item'
import type { ParsedItem } from '../chatgpt/parse-checklist'
import { findBestFuzzyMatch } from './fuzzy-match'

export type MergeSummary = { matched: number; added: number; archived: number }

/** Fingerprint includes order so reorder-only revisions trigger a merge. */
function sourceFingerprint(parsed: ParsedItem[]): string {
  return parsed.map((i) => normalizeItemText(i.text)).join('\n')
}

/** True if active items (order, normalized text, checked) and archived set are unchanged. */
function recordsAreEquivalent(a: ChecklistRecord, b: ChecklistRecord): boolean {
  const activeA = a.items.filter((i) => !i.archived).sort((x, y) => x.order - y.order)
  const activeB = b.items.filter((i) => !i.archived).sort((x, y) => x.order - y.order)
  if (activeA.length !== activeB.length) return false
  for (let i = 0; i < activeA.length; i++) {
    if (normalizeItemText(activeA[i].text) !== normalizeItemText(activeB[i].text)) return false
    if (activeA[i].checked !== activeB[i].checked) return false
  }
  const archivedA = new Set(a.items.filter((i) => i.archived).map((i) => normalizeItemText(i.text)))
  const archivedB = new Set(b.items.filter((i) => i.archived).map((i) => normalizeItemText(i.text)))
  if (archivedA.size !== archivedB.size) return false
  for (const n of archivedA) {
    if (!archivedB.has(n)) return false
  }
  return true
}

/**
 * Merge new parsed source into existing checklist. Preserves matched item id and checked state;
 * updates display text to latest. Unmatched old active items become archived. New items added.
 * Order rebuilt to match source order. Returns null if new fingerprint equals existing or if
 * the merged result is equivalent to existing (no-op).
 */
export function mergeChecklist(
  existing: ChecklistRecord,
  newParsed: ParsedItem[],
): { record: ChecklistRecord; summary: MergeSummary } | null {
  const newFp = newParsed.length > 0 ? sourceFingerprint(newParsed) : null
  if (newFp !== null && existing.sourceFingerprint === newFp) {
    return null
  }

  const activeOld = existing.items
    .filter((i) => !i.archived)
    .sort((a, b) => a.order - b.order)
  const oldNormalized = activeOld.map((i) => normalizeItemText(i.text))
  const usedOld = new Set<number>()
  const archivedOld = existing.items.filter((i) => i.archived)
  const archivedByNorm = new Map<string, ChecklistItem>()
  for (const item of archivedOld) {
    const norm = normalizeItemText(item.text)
    if (!archivedByNorm.has(norm)) archivedByNorm.set(norm, item)
  }
  const usedArchivedIds = new Set<string>()
  const summary: MergeSummary = { matched: 0, added: 0, archived: 0 }

  const mergedActive: ChecklistItem[] = []

  for (let order = 0; order < newParsed.length; order++) {
    const p = newParsed[order]
    const newNorm = normalizeItemText(p.text)

    let exactIdx = -1
    for (let i = 0; i < activeOld.length; i++) {
      if (usedOld.has(i)) continue
      if (oldNormalized[i] === newNorm) {
        exactIdx = i
        break
      }
    }

    if (exactIdx >= 0) {
      usedOld.add(exactIdx)
      const oldItem = activeOld[exactIdx]
      mergedActive.push({
        ...oldItem,
        text: p.text,
        order,
      })
      summary.matched++
      continue
    }

    const fuzzyIdx = findBestFuzzyMatch(newNorm, oldNormalized, usedOld)
    if (fuzzyIdx >= 0 && !usedOld.has(fuzzyIdx)) {
      usedOld.add(fuzzyIdx)
      const oldItem = activeOld[fuzzyIdx]
      mergedActive.push({
        ...oldItem,
        text: p.text,
        order,
      })
      summary.matched++
      continue
    }

    const archivedMatch = archivedByNorm.get(newNorm)
    if (archivedMatch && !usedArchivedIds.has(archivedMatch.id)) {
      usedArchivedIds.add(archivedMatch.id)
      mergedActive.push({
        ...archivedMatch,
        text: p.text,
        checked: archivedMatch.checked,
        archived: false,
        order,
      })
      summary.matched++
      continue
    }

    mergedActive.push({
      id: crypto.randomUUID(),
      text: p.text,
      checked: p.checked,
      archived: false,
      order,
    })
    summary.added++
  }

  const newlyArchived = activeOld
    .filter((_, i) => !usedOld.has(i))
    .map((i) => ({ ...i, archived: true }))
  summary.archived = newlyArchived.length
  const remainingArchived = archivedOld.filter((i) => !usedArchivedIds.has(i.id))
  const allItems = [...mergedActive, ...newlyArchived, ...remainingArchived]
  const record: ChecklistRecord = {
    ...existing,
    sourceFingerprint: newFp,
    updatedAt: Date.now(),
    items: allItems,
  }

  if (recordsAreEquivalent(existing, record)) return null
  return { record, summary }
}
