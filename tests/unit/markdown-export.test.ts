import { describe, it, expect } from 'vitest'
import { generateMarkdownExport } from '../../src/lib/export/markdown-export'
import type { ChecklistRecord } from '../../src/types/checklist'

function makeRecord(overrides: Partial<ChecklistRecord> = {}): ChecklistRecord {
  return {
    version: 1,
    conversationId: 'test-conv-001',
    sourceFingerprint: null,
    updatedAt: new Date('2025-06-15').getTime(),
    createdAt: new Date('2025-06-14').getTime(),
    sourceChatUrl: 'https://chatgpt.com/c/test-conv-001',
    conversationLabel: 'My Test Plan',
    sourceStructure: 'unordered',
    items: [],
    ...overrides,
  }
}

describe('generateMarkdownExport', () => {
  it('produces correct format for 3 checked and 2 unchecked items', () => {
    const record = makeRecord({
      items: [
        { id: '1', text: 'Research competitors', checked: true, archived: false, order: 0 },
        { id: '2', text: 'Define target audience', checked: true, archived: false, order: 1 },
        { id: '3', text: 'Write landing page copy', checked: false, archived: false, order: 2 },
        { id: '4', text: 'Set up analytics', checked: true, archived: false, order: 3 },
        { id: '5', text: 'Launch beta', checked: false, archived: false, order: 4 },
      ],
    })

    const md = generateMarkdownExport(record)
    const lines = md.split('\n')

    expect(lines[0]).toBe('# My Test Plan')
    expect(lines[1]).toMatch(/^> Exported from Living Checklist ·/)
    expect(lines[2]).toBe('')
    expect(lines[3]).toBe('- [x] Research competitors')
    expect(lines[4]).toBe('- [x] Define target audience')
    expect(lines[5]).toBe('- [ ] Write landing page copy')
    expect(lines[6]).toBe('- [x] Set up analytics')
    expect(lines[7]).toBe('- [ ] Launch beta')
  })

  it('uses fallback title when conversationLabel is null', () => {
    const record = makeRecord({
      conversationLabel: null,
      items: [{ id: '1', text: 'Do something', checked: false, archived: false, order: 0 }],
    })

    const md = generateMarkdownExport(record)
    expect(md.startsWith('# Conversation test-conv-001')).toBe(true)
  })

  it('excludes archived items from export', () => {
    const record = makeRecord({
      items: [
        { id: '1', text: 'Active item', checked: false, archived: false, order: 0 },
        { id: '2', text: 'Archived item', checked: false, archived: true, order: 1 },
        { id: '3', text: 'Another active', checked: true, archived: false, order: 2 },
      ],
    })

    const md = generateMarkdownExport(record)
    expect(md).toContain('- [ ] Active item')
    expect(md).toContain('- [x] Another active')
    expect(md).not.toContain('Archived item')
  })

  it('renders items in order field sequence', () => {
    const record = makeRecord({
      items: [
        { id: '3', text: 'Third', checked: false, archived: false, order: 2 },
        { id: '1', text: 'First', checked: false, archived: false, order: 0 },
        { id: '2', text: 'Second', checked: true, archived: false, order: 1 },
      ],
    })

    const md = generateMarkdownExport(record)
    const itemLines = md.split('\n').filter((l) => l.startsWith('- ['))
    expect(itemLines[0]).toBe('- [ ] First')
    expect(itemLines[1]).toBe('- [x] Second')
    expect(itemLines[2]).toBe('- [ ] Third')
  })

  it('uses only the first line for multi-line item text', () => {
    const record = makeRecord({
      items: [
        {
          id: '1',
          text: 'Set up CI/CD pipeline\n\nInstall GitHub Actions and configure the workflow YAML.',
          checked: false,
          archived: false,
          order: 0,
        },
      ],
    })

    const md = generateMarkdownExport(record)
    expect(md).toContain('- [ ] Set up CI/CD pipeline')
    expect(md).not.toContain('Install GitHub Actions')
  })

  it('produces a title line, blockquote line, blank line, then items — for two "sections" simulation', () => {
    // The data model has no sections; simulate two logical groups via item text
    const record = makeRecord({
      conversationLabel: 'Launch Plan',
      items: [
        { id: '1', text: 'Write copy', checked: true, archived: false, order: 0 },
        { id: '2', text: 'Design mockup', checked: true, archived: false, order: 1 },
        { id: '3', text: 'Build landing page', checked: true, archived: false, order: 2 },
        { id: '4', text: 'Set up email capture', checked: false, archived: false, order: 3 },
        { id: '5', text: 'Announce on Twitter', checked: false, archived: false, order: 4 },
      ],
    })

    const md = generateMarkdownExport(record)

    // Header structure
    expect(md).toMatch(/^# Launch Plan\n> Exported from Living Checklist · .+\n\n/)

    // 3 checked
    const checked = md.split('\n').filter((l) => l.startsWith('- [x]'))
    expect(checked).toHaveLength(3)

    // 2 unchecked
    const unchecked = md.split('\n').filter((l) => l.startsWith('- [ ]'))
    expect(unchecked).toHaveLength(2)
  })
})
