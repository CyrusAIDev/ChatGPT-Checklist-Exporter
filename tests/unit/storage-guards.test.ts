import { describe, it, expect } from 'vitest'
import { validateChecklistRecord } from '../../src/lib/storage/storage-guards'

describe('validateChecklistRecord', () => {
  const valid = {
    version: 1,
    conversationId: 'c1',
    sourceFingerprint: 'fp',
    updatedAt: 123,
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
})
