import type { ChecklistItem, ChecklistRecord } from '../../types/checklist'
import { normalizeItemText } from '../chatgpt/normalize-item'
import type { ParsedItem } from '../chatgpt/parse-checklist'
import { findBestFuzzyMatch } from './fuzzy-match'

export type MergeSummary = { matched: number; added: number; archived: number }

function sourceFingerprint(parsed: ParsedItem[]): string {
  const normalized = parsed.map((i) => normalizeItemText(i.text)).sort()
  return normalized.join('\n')
}

/**
 * Merge new parsed source into existing checklist. Preserves matched item id and checked state;
 * updates display text to latest. Unmatched old active items become archived. New items added.
 * Order rebuilt to match source order. Returns null if new fingerprint equals existing (no-op).
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

    mergedActive.push({
      id: crypto.randomUUID(),
      text: p.text,
      checked: p.checked,
      archived: false,
      order,
    })
    summary.added++
  }

  const archivedItems: ChecklistItem[] = activeOld
    .filter((_, i) => !usedOld.has(i))
    .map((i) => ({ ...i, archived: true }))
  summary.archived = archivedItems.length

  const allItems = [...mergedActive, ...archivedItems]
  const record: ChecklistRecord = {
    version: 1,
    conversationId: existing.conversationId,
    sourceFingerprint: newFp,
    updatedAt: Date.now(),
    items: allItems,
  }

  return { record, summary }
}
