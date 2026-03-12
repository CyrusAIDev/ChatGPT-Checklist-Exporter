import { describe, it, expect } from 'vitest'
import {
  parseChecklistFromText,
  parseChecklistFromCandidates,
  parseLatestMessage,
  createChecklistRecord,
} from '../../src/lib/chatgpt/parse-checklist'
import { normalizeItemText } from '../../src/lib/chatgpt/normalize-item'
import type { PageStatePayload } from '../../src/types/messages'

describe('parseChecklistFromText', () => {
  it('parses bullet list', () => {
    const text = '- First\n- Second\n* Third'
    const result = parseChecklistFromText(text, normalizeItemText)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ text: 'First', checked: false })
    expect(result[1]).toEqual({ text: 'Second', checked: false })
    expect(result[2]).toEqual({ text: 'Third', checked: false })
  })

  it('parses numbered list', () => {
    const text = '1. One\n2) Two'
    const result = parseChecklistFromText(text, normalizeItemText)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('One')
    expect(result[1].text).toBe('Two')
  })

  it('parses markdown checkboxes', () => {
    const text = '[ ] Todo\n[x] Done'
    const result = parseChecklistFromText(text, normalizeItemText)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ text: 'Todo', checked: false })
    expect(result[1]).toEqual({ text: 'Done', checked: true })
  })

  it('ignores empty and non-list lines', () => {
    const text = '- A\n\nSome prose here\n- B'
    const result = parseChecklistFromText(text, normalizeItemText)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('A')
    expect(result[1].text).toBe('B')
  })

  it('dedupes by normalized text', () => {
    const text = '- Item\n- item\n- ITEM.'
    const result = parseChecklistFromText(text, normalizeItemText)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Item')
  })
})

describe('parseChecklistFromCandidates', () => {
  it('parses candidates and dedupes', () => {
    const candidates = ['- A', '[x] B', '1. C']
    const result = parseChecklistFromCandidates(candidates, normalizeItemText)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ text: 'A', checked: false })
    expect(result[1]).toEqual({ text: 'B', checked: true })
    expect(result[2]).toEqual({ text: 'C', checked: false })
  })
})

describe('parseLatestMessage', () => {
  it('prefers taskCandidates (DOM-first)', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: '- From text',
      taskCandidates: ['- From DOM'],
    }
    const result = parseLatestMessage(payload)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('From DOM')
  })

  it('falls back to latestMessageText when no candidates', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: '- A\n- B',
      taskCandidates: [],
    }
    const result = parseLatestMessage(payload)
    expect(result).toHaveLength(2)
  })

  it('returns empty when no source', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: null,
      taskCandidates: [],
    }
    expect(parseLatestMessage(payload)).toEqual([])
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
  })
})
