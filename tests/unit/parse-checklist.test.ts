import { describe, it, expect } from 'vitest'
import {
  parseChecklistFromText,
  parseChecklistFromCandidates,
  parseLatestMessage,
  createChecklistRecord,
  inferSourceStructureFromLineKinds,
} from '../../src/lib/chatgpt/parse-checklist'
import { normalizeItemText } from '../../src/lib/chatgpt/normalize-item'
import type { PageStatePayload } from '../../src/types/messages'

describe('inferSourceStructureFromLineKinds', () => {
  it('classifies pure numbered lists as ordered', () => {
    expect(inferSourceStructureFromLineKinds(['numbered', 'numbered'])).toBe('ordered')
  })

  it('classifies pure bullets as unordered', () => {
    expect(inferSourceStructureFromLineKinds(['bullet', 'bullet'])).toBe('unordered')
  })

  it('classifies pure checkboxes as checkbox', () => {
    expect(inferSourceStructureFromLineKinds(['checkbox'])).toBe('checkbox')
  })

  it('classifies mixes as mixed', () => {
    expect(inferSourceStructureFromLineKinds(['bullet', 'numbered'])).toBe('mixed')
  })
})

describe('parseChecklistFromText', () => {
  it('parses bullet list', () => {
    const text = '- First\n- Second\n* Third'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(3)
    expect(sourceStructure).toBe('unordered')
    expect(items[0]).toEqual({ text: 'First', checked: false })
    expect(items[1]).toEqual({ text: 'Second', checked: false })
    expect(items[2]).toEqual({ text: 'Third', checked: false })
  })

  it('parses numbered list and preserves ordered structure', () => {
    const text = '1. One\n2) Two'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('ordered')
    expect(items[0].text).toBe('One')
    expect(items[1].text).toBe('Two')
  })

  it('parses markdown checkboxes', () => {
    const text = '[ ] Todo\n[x] Done'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('checkbox')
    expect(items[0]).toEqual({ text: 'Todo', checked: false })
    expect(items[1]).toEqual({ text: 'Done', checked: true })
  })

  it('ignores empty and non-list lines', () => {
    const text = '- A\n\nSome prose here\n- B'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('unordered')
    expect(items[0].text).toBe('A')
    expect(items[1].text).toBe('B')
  })

  it('dedupes by normalized text but infers structure from all list lines', () => {
    const text = '- Item\n- item\n- ITEM.'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('Item')
    expect(sourceStructure).toBe('unordered')
  })

  it('detects mixed list when bullets and numbers appear', () => {
    const text = '- A\n1. B'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('mixed')
  })
})

describe('parseChecklistFromCandidates', () => {
  it('parses candidates and dedupes', () => {
    const candidates = ['- A', '[x] B', '1. C']
    const { items, sourceStructure } = parseChecklistFromCandidates(candidates, normalizeItemText)
    expect(items).toHaveLength(3)
    expect(sourceStructure).toBe('mixed')
    expect(items[0]).toEqual({ text: 'A', checked: false })
    expect(items[1]).toEqual({ text: 'B', checked: true })
    expect(items[2]).toEqual({ text: 'C', checked: false })
  })
})

describe('parseLatestMessage', () => {
  it('prefers taskCandidates (DOM-first)', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: '- From text',
      taskCandidates: ['- From DOM'],
      conversationTitle: null,
      isGenerating: false,
    }
    const { items, sourceStructure } = parseLatestMessage(payload)
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('From DOM')
    expect(sourceStructure).toBe('unordered')
  })

  it('falls back to latestMessageText when no candidates', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: '1. A\n2. B',
      taskCandidates: [],
      conversationTitle: null,
      isGenerating: false,
    }
    const { items, sourceStructure } = parseLatestMessage(payload)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('ordered')
  })

  it('returns empty when no source', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: null,
      taskCandidates: [],
      conversationTitle: null,
      isGenerating: false,
    }
    expect(parseLatestMessage(payload)).toEqual({ items: [], sourceStructure: 'unordered' })
  })
})

describe('createChecklistRecord', () => {
  it('creates record with ids and order', () => {
    const items = [
      { text: 'A', checked: false },
      { text: 'B', checked: true },
    ]
    const record = createChecklistRecord('conv-1', items)
    expect(record.version).toBe(1)
    expect(record.conversationId).toBe('conv-1')
    expect(record.sourceFingerprint).not.toBeNull()
    expect(record.items).toHaveLength(2)
    expect(record.items[0].text).toBe('A')
    expect(record.items[0].checked).toBe(false)
    expect(record.items[0].archived).toBe(false)
    expect(record.items[0].order).toBe(0)
    expect(record.items[1].text).toBe('B')
    expect(record.items[1].checked).toBe(true)
    expect(record.items[0].id).not.toBe(record.items[1].id)
    expect(record.sourceChatUrl).toBe('https://chatgpt.com/c/conv-1')
    expect(record.conversationLabel).toBeNull()
    expect(record.createdAt).toBe(record.updatedAt)
    expect(record.sourceStructure).toBe('unordered')
  })

  it('stores label and URL from meta', () => {
    const items = [{ text: 'A', checked: false }]
    const record = createChecklistRecord('conv-1', items, {
      sourceChatUrl: 'https://chatgpt.com/c/conv-1',
      conversationLabel: 'Sprint plan',
    })
    expect(record.conversationLabel).toBe('Sprint plan')
    expect(record.sourceChatUrl).toBe('https://chatgpt.com/c/conv-1')
  })

  it('stores sourceStructure from meta when provided', () => {
    const items = [{ text: 'A', checked: false }]
    const record = createChecklistRecord('conv-1', items, {
      sourceChatUrl: 'https://chatgpt.com/c/conv-1',
      conversationLabel: null,
      sourceStructure: 'ordered',
    })
    expect(record.sourceStructure).toBe('ordered')
  })
})
