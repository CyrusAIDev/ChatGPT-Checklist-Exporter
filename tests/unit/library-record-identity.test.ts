import { describe, it, expect } from 'vitest'
import { validateChecklistRecord } from '../../src/lib/storage/storage-guards'

/**
 * Opening / toggling in the library must not rewrite identity fields unexpectedly.
 */
describe('library record identity', () => {
  it('validate keeps conversationId and item ids stable for a stored shape', () => {
    const raw = {
      version: 1,
      conversationId: 'same-id',
      sourceFingerprint: 'fp',
      updatedAt: 500,
      createdAt: 100,
      sourceChatUrl: 'https://chatgpt.com/c/same-id',
      conversationLabel: 'X',
      items: [{ id: 'item-uuid', text: 'Do thing', checked: true, archived: false, order: 0 }],
    }
    const a = validateChecklistRecord(raw)
    const toggled = validateChecklistRecord({
      ...raw,
      updatedAt: 600,
      items: [{ ...raw.items[0], checked: false }],
    })
    expect(a?.conversationId).toBe('same-id')
    expect(toggled?.conversationId).toBe('same-id')
    expect(toggled?.items[0].id).toBe('item-uuid')
  })

  it('toggle-style updates only change checked and updatedAt', () => {
    const raw = {
      version: 1,
      conversationId: 'id-1',
      sourceFingerprint: null,
      updatedAt: 100,
      createdAt: 50,
      sourceChatUrl: 'https://chatgpt.com/c/id-1',
      conversationLabel: 'L',
      items: [{ id: 'u1', text: 'Task', checked: false, archived: false, order: 0 }],
    }
    const afterToggle = { ...raw, updatedAt: 200, items: [{ ...raw.items[0], checked: true }] }
    const v = validateChecklistRecord(afterToggle)
    expect(v?.createdAt).toBe(50)
    expect(v?.sourceChatUrl).toBe('https://chatgpt.com/c/id-1')
    expect(v?.items[0].checked).toBe(true)
  })
})
