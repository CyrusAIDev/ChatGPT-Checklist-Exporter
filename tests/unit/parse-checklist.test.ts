import { describe, it, expect } from 'vitest'
import {
  parseChecklistFromText,
  parseChecklistFromCandidates,
  parseChecklistFromHtmlListItems,
  parseLatestMessage,
  createChecklistRecord,
  inferSourceStructureFromLineKinds,
  inferSourceStructureFromDomListKinds,
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

describe('inferSourceStructureFromDomListKinds', () => {
  it('classifies all-ordered HTML lists', () => {
    expect(inferSourceStructureFromDomListKinds(['ordered', 'ordered'])).toBe('ordered')
  })

  it('classifies all-unordered HTML lists', () => {
    expect(inferSourceStructureFromDomListKinds(['unordered'])).toBe('unordered')
  })

  it('classifies ol+ul mix as mixed', () => {
    expect(inferSourceStructureFromDomListKinds(['ordered', 'unordered'])).toBe('mixed')
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

  it('parses GFM task list lines (- [ ] and * [x])', () => {
    const text = '- [ ] Open task\n* [x] Closed task'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('checkbox')
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ text: 'Open task', checked: false })
    expect(items[1]).toEqual({ text: 'Closed task', checked: true })
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

  it('skips intro prose before a numbered list', () => {
    const text =
      'Here is a short introduction.\nIt spans two lines before the real plan.\n\n1. First step\n2. Second step\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('First step')
    expect(items[1].text).toBe('Second step')
  })

  it('parses emoji section heading as ordered parent with children as body', () => {
    const text = '🧠 1. Validate the Idea\n- Talk to users\n- Sketch flows\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(items).toHaveLength(1)
    expect(sourceStructure).toBe('ordered')
    expect(items[0].text).toContain('Validate the Idea')
    expect(items[0].text).toContain('Talk to users')
    expect(items[0].text).toContain('Sketch flows')
  })

  it('groups nested bullets under numbered parent steps', () => {
    const text = '1. First step\n   - Sub-point A\n   - Sub-point B\n2. Second step\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('First step')
    expect(items[0].text).toContain('Sub-point A')
    expect(items[0].text).toContain('Sub-point B')
    expect(items[1].text).toBe('Second step')
  })

  it('groups non-indented nested bullets under numbered parents', () => {
    const text = '1. First step\n- Detail A\n- Detail B\n2. Second step\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('First step')
    expect(items[0].text).toContain('Detail A')
    expect(items[1].text).toBe('Second step')
  })

  it('preserves intro skip with numbered list + nested bullets', () => {
    const text =
      'Here is the plan:\n\n1. Research the market\n- Read papers\n- Interview users\n2. Build prototype\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('Research the market')
    expect(items[0].text).toContain('Read papers')
    expect(items[1].text).toContain('Build prototype')
  })

  it('handles multiple emoji section headings as ordered parent items', () => {
    const text =
      '🧠 1. Validate the Idea\n- Talk to users\n- Sketch flows\n\n🎨 2. Design the Flow\n- Create mockups\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('Validate the Idea')
    expect(items[0].text).toContain('Talk to users')
    expect(items[1].text).toContain('Design the Flow')
    expect(items[1].text).toContain('Create mockups')
  })

  it('handles GFM checkboxes in code-style pre blocks via text fallback', () => {
    const text = '- [ ] Set up CI\n- [x] Write tests\n- [ ] Deploy to staging\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('checkbox')
    expect(items).toHaveLength(3)
    expect(items[0]).toEqual({ text: 'Set up CI', checked: false })
    expect(items[1]).toEqual({ text: 'Write tests', checked: true })
    expect(items[2]).toEqual({ text: 'Deploy to staging', checked: false })
  })

  it('generic bullet list still parses as unordered', () => {
    const text = '- Buy milk\n- Walk the dog\n- Call dentist\n'
    const { items, sourceStructure } = parseChecklistFromText(text, normalizeItemText)
    expect(sourceStructure).toBe('unordered')
    expect(items).toHaveLength(3)
    expect(items[0].text).toBe('Buy milk')
  })
})

describe('parseChecklistFromHtmlListItems', () => {
  it('keeps multiline li text and infers ordered structure', () => {
    const rows = [
      { text: 'Step title\n\nExplanation paragraph for this step.', listKind: 'ordered' as const },
      { text: 'Step two', listKind: 'ordered' as const },
    ]
    const { items, sourceStructure } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('Explanation paragraph')
    expect(items[1].text).toBe('Step two')
  })

  it('keeps ordered sequence when HTML rows reflect split lists (e.g. media between blocks)', () => {
    const rows = [
      { text: 'Step before media', listKind: 'ordered' as const },
      { text: 'Step after media', listKind: 'ordered' as const },
    ]
    const { items, sourceStructure } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items.map((i) => i.text)).toEqual(['Step before media', 'Step after media'])
  })

  it('strips markdown-style prefix from first line only inside HTML li', () => {
    const rows = [{ text: '- Inner bullet line\nBody', listKind: 'unordered' as const }]
    const { items } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(items).toHaveLength(1)
    expect(items[0].text).toContain('Body')
    expect(items[0].text.startsWith('-')).toBe(false)
  })

  it('groups interleaved ul items under preceding ol items (split lists from media)', () => {
    const rows = [
      { text: 'Step 1 title', listKind: 'ordered' as const },
      { text: 'Supporting detail A', listKind: 'unordered' as const },
      { text: 'Supporting detail B', listKind: 'unordered' as const },
      { text: 'Step 2 title', listKind: 'ordered' as const },
    ]
    const { items, sourceStructure } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('Step 1 title')
    expect(items[0].text).toContain('Supporting detail A')
    expect(items[0].text).toContain('Supporting detail B')
    expect(items[1].text).toBe('Step 2 title')
  })

  it('preserves ordered structure when split by media (multiple ol fragments)', () => {
    const rows = [
      { text: 'Step before media', listKind: 'ordered' as const },
      { text: 'Step after media', listKind: 'ordered' as const },
      { text: 'Final step', listKind: 'ordered' as const },
    ]
    const { items, sourceStructure } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(sourceStructure).toBe('ordered')
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.text)).toEqual([
      'Step before media',
      'Step after media',
      'Final step',
    ])
  })

  it('preserves paragraph breaks in multiline ordered li text', () => {
    const rows = [
      { text: 'Step title\n\nExplanation paragraph.', listKind: 'ordered' as const },
      { text: 'Step two', listKind: 'ordered' as const },
    ]
    const { items } = parseChecklistFromHtmlListItems(rows, normalizeItemText)
    expect(items[0].text).toBe('Step title\n\nExplanation paragraph.')
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

  it('parses GFM task lines in candidates', () => {
    const candidates = ['- [ ] From DOM', '* [x] Done']
    const { items, sourceStructure } = parseChecklistFromCandidates(candidates, normalizeItemText)
    expect(sourceStructure).toBe('checkbox')
    expect(items[0]).toEqual({ text: 'From DOM', checked: false })
    expect(items[1]).toEqual({ text: 'Done', checked: true })
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

  it('prefers htmlListItems over markdown taskCandidates when enough rows', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: 'noise',
      taskCandidates: ['- From markdown'],
      htmlListItems: [
        { text: 'Plain step one\n\nDetails.', listKind: 'ordered' },
        { text: 'Plain step two', listKind: 'ordered' },
      ],
      conversationTitle: null,
      isGenerating: false,
    }
    const { items, sourceStructure } = parseLatestMessage(payload)
    expect(items).toHaveLength(2)
    expect(items[0].text).toContain('Details')
    expect(items[1].text).toBe('Plain step two')
    expect(sourceStructure).toBe('ordered')
  })

  it('falls back to latestMessageText when fewer than two HTML list rows', () => {
    const payload: PageStatePayload = {
      conversationId: 'c1',
      supported: true,
      latestMessageText: '1. A\n2. B',
      taskCandidates: [],
      htmlListItems: [{ text: 'Only one native li', listKind: 'ordered' }],
      conversationTitle: null,
      isGenerating: false,
    }
    const { items, sourceStructure } = parseLatestMessage(payload)
    expect(items).toHaveLength(2)
    expect(sourceStructure).toBe('ordered')
    expect(items[0].text).toBe('A')
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

  it('keeps item order for ordered sourceStructure (library / chat rendering)', () => {
    const items = [
      { text: 'First', checked: false },
      { text: 'Second', checked: true },
    ]
    const record = createChecklistRecord('conv-1', items, {
      sourceChatUrl: 'https://chatgpt.com/c/conv-1',
      conversationLabel: null,
      sourceStructure: 'ordered',
    })
    expect(record.items.map((i) => i.text)).toEqual(['First', 'Second'])
    expect(record.items.map((i) => i.order)).toEqual([0, 1])
  })
})

describe('merge / no-op stability with ordered items', () => {
  it('ordered record fingerprint is stable for identical captures', () => {
    const items = [
      { text: 'Step one', checked: false },
      { text: 'Step two', checked: false },
    ]
    const r1 = createChecklistRecord('c1', items, {
      sourceChatUrl: 'https://chatgpt.com/c/c1',
      conversationLabel: null,
      sourceStructure: 'ordered',
    })
    const r2 = createChecklistRecord('c1', items, {
      sourceChatUrl: 'https://chatgpt.com/c/c1',
      conversationLabel: null,
      sourceStructure: 'ordered',
    })
    expect(r1.sourceFingerprint).toBe(r2.sourceFingerprint)
  })

  it('ordered items match by normalized text regardless of number change', () => {
    const text1 = '1. Research the market\n2. Build the prototype\n'
    const text2 = '1. Build the prototype\n2. Research the market\n'
    const parsed1 = parseChecklistFromText(text1, normalizeItemText)
    const parsed2 = parseChecklistFromText(text2, normalizeItemText)
    const normalized1 = parsed1.items.map((i) => normalizeItemText(i.text))
    const normalized2 = parsed2.items.map((i) => normalizeItemText(i.text))
    expect(new Set(normalized1)).toEqual(new Set(normalized2))
  })
})
