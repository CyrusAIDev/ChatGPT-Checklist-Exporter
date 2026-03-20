import { describe, it, expect } from 'vitest'
import { validateChecklistRecord } from '../../src/lib/storage/storage-guards'

describe('validateChecklistRecord', () => {
  const valid = {
    version: 1,
    conversationId: 'c1',
    sourceFingerprint: 'fp',
    updatedAt: 123,
    createdAt: 100,
    sourceChatUrl: 'https://chatgpt.com/c/c1',
    conversationLabel: 'My thread',
    items: [
      { id: 'i1', text: 'A', checked: false, archived: false, order: 0 },
    ],
  }

  it('accepts valid record', () => {
    expect(validateChecklistRecord(valid)).toEqual(valid)
  })

  it('returns null for null/undefined', () => {
    expect(validateChecklistRecord(null)).toBeNull()
    expect(validateChecklistRecord(undefined)).toBeNull()
  })

  it('returns null for wrong version', () => {
    expect(validateChecklistRecord({ ...valid, version: 2 })).toBeNull()
  })

  it('returns null for missing conversationId', () => {
    expect(validateChecklistRecord({ ...valid, conversationId: '' })).toBeNull()
    expect(validateChecklistRecord({ ...valid, conversationId: 1 })).toBeNull()
  })

  it('returns null for invalid items', () => {
    expect(validateChecklistRecord({ ...valid, items: [] })).not.toBeNull()
    expect(validateChecklistRecord({ ...valid, items: [{ id: 'i1', text: 'A', checked: false, archived: false }] })).toBeNull()
    expect(validateChecklistRecord({ ...valid, items: [null] })).toBeNull()
  })

  it('backfills createdAt, sourceChatUrl, and conversationLabel for legacy shapes', () => {
    const legacy = {
      version: 1,
      conversationId: 'abc',
      sourceFingerprint: null,
      updatedAt: 999,
      items: [{ id: 'i1', text: 'A', checked: false, archived: false, order: 0 }],
    }
    expect(validateChecklistRecord(legacy)).toEqual({
      version: 1,
      conversationId: 'abc',
      sourceFingerprint: null,
      updatedAt: 999,
      createdAt: 999,
      sourceChatUrl: 'https://chatgpt.com/c/abc',
      conversationLabel: null,
      items: [{ id: 'i1', text: 'A', checked: false, archived: false, order: 0 }],
    })
  })
})
