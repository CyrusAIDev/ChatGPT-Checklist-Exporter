import { describe, it, expect } from 'vitest'
import type { ChecklistRecord } from '../../src/types/checklist'
import {
  checklistProgressCounts,
  filterChecklistsByQuery,
  libraryDisplayTitle,
  sortChecklistsByUpdatedDesc,
} from '../../src/lib/library/library-query'

function makeRecord(
  id: string,
  opts: Partial<Pick<ChecklistRecord, 'updatedAt' | 'conversationLabel' | 'items'>>,
): ChecklistRecord {
  const items = opts.items ?? [
    { id: '1', text: 'Alpha', checked: true, archived: false, order: 0 },
    { id: '2', text: 'Beta task', checked: false, archived: false, order: 1 },
  ]
  return {
    version: 1,
    conversationId: id,
    sourceFingerprint: null,
    updatedAt: opts.updatedAt ?? 0,
    createdAt: 0,
    sourceChatUrl: `https://chatgpt.com/c/${id}`,
    conversationLabel: opts.conversationLabel ?? null,
    items,
  }
}

describe('library-query', () => {
  it('sorts by most recently updated', () => {
    const a = makeRecord('a', { updatedAt: 100 })
    const b = makeRecord('b', { updatedAt: 300 })
    const c = makeRecord('c', { updatedAt: 200 })
    const sorted = sortChecklistsByUpdatedDesc([a, b, c])
    expect(sorted.map((r) => r.conversationId)).toEqual(['b', 'c', 'a'])
  })

  it('filters by title or item text', () => {
    const r1 = makeRecord('x', {
      conversationLabel: 'Onboarding',
      updatedAt: 1,
      items: [{ id: '1', text: 'Only alpha', checked: true, archived: false, order: 0 }],
    })
    const r2 = makeRecord('y', { conversationLabel: 'Other', updatedAt: 2 })
    const hay = filterChecklistsByQuery([r1, r2], 'board')
    expect(hay.map((r) => r.conversationId)).toEqual(['x'])
    const itemHit = filterChecklistsByQuery([r1, r2], 'beta')
    expect(itemHit.map((r) => r.conversationId)).toEqual(['y'])
  })

  it('checklistProgressCounts separates active and archived', () => {
    const r = makeRecord('z', {
      items: [
        { id: '1', text: 'A', checked: true, archived: false, order: 0 },
        { id: '2', text: 'B', checked: false, archived: false, order: 1 },
        { id: '3', text: 'C', checked: false, archived: true, order: 2 },
      ],
    })
    expect(checklistProgressCounts(r)).toEqual({
      activeTotal: 2,
      activeCompleted: 1,
      archivedTotal: 1,
    })
  })

  it('libraryDisplayTitle falls back to conversation id', () => {
    const r = makeRecord('abc123', { conversationLabel: '  ' })
    expect(libraryDisplayTitle(r)).toBe('Conversation abc123')
    expect(libraryDisplayTitle({ ...r, conversationLabel: 'Named' })).toBe('Named')
  })
})
