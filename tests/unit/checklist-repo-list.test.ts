import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listAllChecklists } from '../../src/lib/storage/checklist-repo'

function sampleRecord(id: string, updatedAt: number) {
  return {
    version: 1,
    conversationId: id,
    sourceFingerprint: null,
    updatedAt,
    createdAt: updatedAt,
    sourceChatUrl: `https://chatgpt.com/c/${id}`,
    conversationLabel: null,
    items: [{ id: 'i1', text: 'T', checked: false, archived: false, order: 0 }],
  }
}

describe('listAllChecklists', () => {
  const get = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: { get },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists saved checklists across conversation keys', async () => {
    get.mockResolvedValue({
      'checklist:thread-a': sampleRecord('thread-a', 10),
      'checklist:thread-b': sampleRecord('thread-b', 20),
      'other:key': {},
      unrelated: 1,
    })
    const rows = await listAllChecklists()
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.conversationId).sort()).toEqual(['thread-a', 'thread-b'])
  })
})
