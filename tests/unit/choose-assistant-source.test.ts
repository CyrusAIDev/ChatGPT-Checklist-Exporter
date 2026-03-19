import { describe, it, expect } from 'vitest'
import { chooseAssistantSource, type AssistantSourceCandidate } from '../../src/lib/chatgpt/choose-assistant-source'

function c(
  domIndex: number,
  opts: Partial<Pick<AssistantSourceCandidate, 'visible' | 'selected' | 'turnGroupKey'>> = {},
): AssistantSourceCandidate {
  return {
    domIndex,
    hasTextContent: true,
    visible: opts.visible ?? true,
    selected: opts.selected ?? false,
    turnGroupKey: opts.turnGroupKey ?? null,
  }
}

describe('chooseAssistantSource', () => {
  it('multiple assistant messages from different turns, all visible -> choose the last one', () => {
    const candidates = [c(0), c(1), c(2)]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBe(2)
    expect(out.ambiguousResponseVersions).toBe(false)
  })

  it('previous turn + latest turn both visible -> choose latest, not ambiguous', () => {
    const candidates = [
      c(0, { turnGroupKey: 'article:0' }),
      c(1, { turnGroupKey: 'article:1' }),
    ]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBe(1)
    expect(out.ambiguousResponseVersions).toBe(false)
  })

  it('same-turn multi-candidate with one selected -> choose selected', () => {
    const candidates = [
      c(0, { turnGroupKey: 'article:5', selected: false }),
      c(1, { turnGroupKey: 'article:5', selected: true }),
    ]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBe(1)
    expect(out.ambiguousResponseVersions).toBe(false)
  })

  it('same-turn multi-candidate with no selected -> ambiguous when grouping is positive', () => {
    const candidates = [
      c(0, { turnGroupKey: 'article:5', selected: false }),
      c(1, { turnGroupKey: 'article:5', selected: false }),
    ]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBeNull()
    expect(out.ambiguousResponseVersions).toBe(true)
  })

  it('same-turn multi-candidate with no selected but no grouping signal -> choose last, not ambiguous', () => {
    const candidates = [
      c(0, { turnGroupKey: null, selected: false }),
      c(1, { turnGroupKey: null, selected: false }),
    ]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBe(1)
    expect(out.ambiguousResponseVersions).toBe(false)
  })

  it('no candidates with content -> null index, not ambiguous', () => {
    const out = chooseAssistantSource([])
    expect(out.chosenCandidateIndex).toBeNull()
    expect(out.ambiguousResponseVersions).toBe(false)
  })

  it('multiple selected in same-turn suffix -> ambiguous', () => {
    const candidates = [
      c(0, { turnGroupKey: 'article:5', selected: true }),
      c(1, { turnGroupKey: 'article:5', selected: true }),
    ]
    const out = chooseAssistantSource(candidates)
    expect(out.chosenCandidateIndex).toBeNull()
    expect(out.ambiguousResponseVersions).toBe(true)
  })
})
