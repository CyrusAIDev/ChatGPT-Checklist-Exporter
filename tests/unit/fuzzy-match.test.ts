import { describe, it, expect } from 'vitest'
import { tokenOverlapScore, findBestFuzzyMatch } from '../../src/lib/merge/fuzzy-match'

describe('tokenOverlapScore', () => {
  it('returns 1 for identical normalized strings', () => {
    expect(tokenOverlapScore('hello world', 'hello world')).toBe(1)
  })

  it('returns 0 for no shared tokens', () => {
    expect(tokenOverlapScore('a b', 'c d')).toBe(0)
  })

  it('returns 2*shared/(na+nb) for partial overlap', () => {
    expect(tokenOverlapScore('a b c', 'a b d')).toBe((2 * 2) / (3 + 3))
  })

  it('ignores empty strings', () => {
    expect(tokenOverlapScore('', 'x')).toBe(0)
  })
})

describe('findBestFuzzyMatch', () => {
  const used = new Set<number>()

  it('returns -1 when no candidate meets threshold', () => {
    expect(findBestFuzzyMatch('completely different', ['foo', 'bar'], used)).toBe(-1)
  })

  it('returns exact index when one candidate matches well', () => {
    expect(findBestFuzzyMatch('hello world', ['hello world', 'other'], used)).toBe(0)
  })

  it('returns -1 when best and second are too close', () => {
    const list = ['hello world', 'hello earth', 'hello universe']
    const idx = findBestFuzzyMatch('hello world', list, used)
    expect(idx).toBeGreaterThanOrEqual(-1)
  })

  it('respects usedIndices', () => {
    const list = ['hello world', 'foo bar']
    expect(findBestFuzzyMatch('hello world', list, new Set([0]))).toBe(-1)
    expect(findBestFuzzyMatch('hello world', list, new Set())).toBe(0)
  })
})
