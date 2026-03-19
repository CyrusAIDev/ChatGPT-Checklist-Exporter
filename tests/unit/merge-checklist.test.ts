import { describe, it, expect } from 'vitest'
import { mergeChecklist } from '../../src/lib/merge/merge-checklist'
import type { ChecklistRecord } from '../../src/types/checklist'
import type { ParsedItem } from '../../src/lib/chatgpt/parse-checklist'

function record(items: Array<{ id: string; text: string; checked: boolean; archived?: boolean; order: number }>): ChecklistRecord {
  return {
    version: 1,
    conversationId: 'c1',
    sourceFingerprint: null,
    updatedAt: 0,
    items: items.map((i) => ({
      id: i.id,
      text: i.text,
      checked: i.checked,
      archived: i.archived ?? false,
      order: i.order,
    })),
  }
}

describe('mergeChecklist', () => {
  it('returns null when normalized items and order unchanged (no-op)', () => {
    const existing = record([
      { id: 'i1', text: 'Task one', checked: false, order: 0 },
      { id: 'i2', text: 'Task two', checked: true, order: 1 },
    ])
    existing.sourceFingerprint = 'task one\ntask two'
    const newParsed: ParsedItem[] = [
      { text: 'Task one', checked: false },
      { text: 'Task two', checked: false },
    ]
    const result = mergeChecklist(existing, newParsed)
    expect(result).toBeNull()
  })

  it('reorder-only revision triggers merge and updates order while preserving checked state', () => {
    const existing = record([
      { id: 'i1', text: 'First', checked: true, order: 0 },
      { id: 'i2', text: 'Second', checked: false, order: 1 },
      { id: 'i3', text: 'Third', checked: true, order: 2 },
    ])
    existing.sourceFingerprint = 'first\nsecond\nthird'
    const newParsed: ParsedItem[] = [
      { text: 'Third', checked: false },
      { text: 'First', checked: false },
      { text: 'Second', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(active).toHaveLength(3)
    expect(active[0].text).toBe('Third')
    expect(active[0].id).toBe('i3')
    expect(active[0].checked).toBe(true)
    expect(active[1].text).toBe('First')
    expect(active[1].id).toBe('i1')
    expect(active[1].checked).toBe(true)
    expect(active[2].text).toBe('Second')
    expect(active[2].id).toBe('i2')
    expect(active[2].checked).toBe(false)
    expect(out!.summary.matched).toBe(3)
    expect(out!.summary.added).toBe(0)
    expect(out!.summary.archived).toBe(0)
  })

  it('exact match preserves id and checked state', () => {
    const existing = record([
      { id: 'i1', text: 'Do this', checked: true, order: 0 },
      { id: 'i2', text: 'Do that', checked: false, order: 1 },
    ])
    const newParsed: ParsedItem[] = [
      { text: 'Do this', checked: false },
      { text: 'Do that', checked: true },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(active[0].id).toBe('i1')
    expect(active[0].checked).toBe(true)
    expect(active[1].id).toBe('i2')
    expect(active[1].checked).toBe(false)
    expect(out!.summary.matched).toBe(2)
    expect(out!.summary.archived).toBe(0)
  })

  it('unmatched old active items become archived', () => {
    const existing = record([
      { id: 'i1', text: 'Only item', checked: true, order: 0 },
    ])
    const newParsed: ParsedItem[] = [
      { text: 'New item', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const archived = out!.record.items.filter((i) => i.archived)
    expect(archived).toHaveLength(1)
    expect(archived[0].text).toBe('Only item')
    expect(out!.summary.archived).toBe(1)
    expect(out!.summary.added).toBe(1)
  })

  it('new items get added with correct order', () => {
    const existing = record([
      { id: 'i1', text: 'A', checked: false, order: 0 },
    ])
    const newParsed: ParsedItem[] = [
      { text: 'A', checked: false },
      { text: 'B', checked: false },
      { text: 'C', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(active).toHaveLength(3)
    expect(active[0].text).toBe('A')
    expect(active[1].text).toBe('B')
    expect(active[2].text).toBe('C')
    expect(out!.summary.matched).toBe(1)
    expect(out!.summary.added).toBe(2)
  })

  it('matched item text updates to latest source text and keeps checked', () => {
    const existing = record([
      { id: 'i1', text: 'Complete the project report', checked: true, order: 0 },
    ])
    const newParsed: ParsedItem[] = [
      { text: 'Complete the project report today', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived)
    expect(active[0].text).toBe('Complete the project report today')
    expect(active[0].checked).toBe(true)
    expect(active[0].id).toBe('i1')
  })

  it('archived item reappearing in revision is unarchived and preserves id and checked state', () => {
    const existing = record([
      { id: 'i1', text: 'Keep', checked: false, order: 0 },
      { id: 'i2', text: 'Was removed', checked: true, archived: true, order: 1 },
    ])
    existing.sourceFingerprint = 'keep'
    const newParsed: ParsedItem[] = [
      { text: 'Keep', checked: false },
      { text: 'Was removed', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(active).toHaveLength(2)
    expect(active[0].id).toBe('i1')
    expect(active[0].text).toBe('Keep')
    expect(active[1].id).toBe('i2')
    expect(active[1].text).toBe('Was removed')
    expect(active[1].checked).toBe(true)
    expect(active[1].archived).toBe(false)
    const archived = out!.record.items.filter((i) => i.archived)
    expect(archived).toHaveLength(0)
  })

  it('multi-round merge: archive then return preserves identity and checked state', () => {
    let existing = record([
      { id: 'a', text: 'Alpha', checked: true, order: 0 },
      { id: 'b', text: 'Beta', checked: false, order: 1 },
      { id: 'c', text: 'Gamma', checked: true, order: 2 },
    ])
    existing.sourceFingerprint = 'alpha\nbeta\ngamma'
    const round1 = mergeChecklist(existing, [
      { text: 'Alpha', checked: false },
      { text: 'Gamma', checked: false },
    ])
    expect(round1).not.toBeNull()
    existing = round1!.record
    const archivedAfter1 = existing.items.filter((i) => i.archived)
    expect(archivedAfter1).toHaveLength(1)
    expect(archivedAfter1[0].id).toBe('b')
    expect(archivedAfter1[0].checked).toBe(false)
    const round2 = mergeChecklist(existing, [
      { text: 'Alpha', checked: false },
      { text: 'Beta', checked: false },
      { text: 'Gamma', checked: false },
    ])
    expect(round2).not.toBeNull()
    const activeAfter2 = round2!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(activeAfter2).toHaveLength(3)
    expect(activeAfter2[0].id).toBe('a')
    expect(activeAfter2[1].id).toBe('b')
    expect(activeAfter2[2].id).toBe('c')
    expect(activeAfter2[1].checked).toBe(false)
    expect(activeAfter2[1].archived).toBe(false)
  })

  it('ambiguous fuzzy match stays conservative and adds as new item', () => {
    const existing = record([
      { id: 'i1', text: 'Implement login page', checked: false, order: 0 },
      { id: 'i2', text: 'Implement signup page', checked: false, order: 1 },
    ])
    existing.sourceFingerprint = 'implement login page\nimplement signup page'
    const newParsed: ParsedItem[] = [
      { text: 'Implement login page', checked: false },
      { text: 'Implement signup page', checked: false },
      { text: 'Implement settings page', checked: false },
    ]
    const out = mergeChecklist(existing, newParsed)
    expect(out).not.toBeNull()
    const active = out!.record.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order)
    expect(active).toHaveLength(3)
    expect(active[0].id).toBe('i1')
    expect(active[1].id).toBe('i2')
    expect(active[2].text).toBe('Implement settings page')
    expect(out!.summary.matched).toBe(2)
    expect(out!.summary.added).toBe(1)
  })
})
