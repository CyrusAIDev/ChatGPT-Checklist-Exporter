import { describe, it, expect } from 'vitest'
import { normalizeItemText } from '../../src/lib/chatgpt/normalize-item'

describe('normalizeItemText', () => {
  it('lowercases and trims', () => {
    expect(normalizeItemText('  FOO BAR  ')).toBe('foo bar')
  })

  it('strips checkbox prefixes', () => {
    expect(normalizeItemText('[ ] Do something')).toBe('do something')
    expect(normalizeItemText('[x] Done')).toBe('done')
    expect(normalizeItemText('[X] Done')).toBe('done')
  })

  it('strips bullet prefixes', () => {
    expect(normalizeItemText('- Item')).toBe('item')
    expect(normalizeItemText('* Item')).toBe('item')
    expect(normalizeItemText('• Item')).toBe('item')
  })

  it('strips numbered prefixes', () => {
    expect(normalizeItemText('1. Item')).toBe('item')
    expect(normalizeItemText('2) Item')).toBe('item')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeItemText('a   b   c')).toBe('a b c')
  })

  it('strips trailing punctuation', () => {
    expect(normalizeItemText('Item.')).toBe('item')
    expect(normalizeItemText('Item;')).toBe('item')
    expect(normalizeItemText('Item?')).toBe('item')
  })

  it('combines all normalizations', () => {
    expect(normalizeItemText('-  [ ]  Do   it.  ')).toBe('do it')
  })
})
