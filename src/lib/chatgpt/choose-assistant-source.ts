/**
 * Pure, DOM-free selection of which assistant message to use as the checklist source.
 * Callers supply ordered metadata from the page; this module encodes the product rules.
 */

export type AssistantSourceCandidate = {
  /** Stable index in DOM order among contentful assistant nodes (0..n-1). */
  domIndex: number
  /** True if this node has extractable content (caller only passes contentful rows). */
  hasTextContent: boolean
  visible: boolean
  selected: boolean
  /**
   * When two+ contentful assistant nodes share the same non-null key, they are treated
   * as alternate bodies for the same turn (e.g. version switcher inside one article).
   * When null, this row is not grouped with others for same-turn ambiguity.
   */
  turnGroupKey: string | null
}

export type ChooseAssistantSourceResult = {
  /** Index into the `contentfulCandidates` array, or null if ambiguous / no choice. */
  chosenCandidateIndex: number | null
  ambiguousResponseVersions: boolean
}

/**
 * Choose which contentful assistant candidate to use.
 *
 * Rules:
 * - Default: last candidate in DOM order (latest reply).
 * - Multiple visible candidates across different turns never implies ambiguity.
 * - Ambiguity only when the latest turn is positively identified (shared non-null
 *   turnGroupKey on a suffix of length ≥ 2) and there is no single selected winner.
 */
export function chooseAssistantSource(
  contentfulCandidates: AssistantSourceCandidate[],
): ChooseAssistantSourceResult {
  if (contentfulCandidates.length === 0) {
    return { chosenCandidateIndex: null, ambiguousResponseVersions: false }
  }

  const lastIdx = contentfulCandidates.length - 1
  const last = contentfulCandidates[lastIdx]
  const K = last.turnGroupKey

  if (K === null) {
    return { chosenCandidateIndex: lastIdx, ambiguousResponseVersions: false }
  }

  let start = lastIdx
  while (start > 0 && contentfulCandidates[start - 1].turnGroupKey === K) {
    start -= 1
  }
  const suffix = contentfulCandidates.slice(start)

  if (suffix.length === 1) {
    return { chosenCandidateIndex: start, ambiguousResponseVersions: false }
  }

  const selectedInSuffix = suffix.filter((c) => c.selected)
  if (selectedInSuffix.length === 1) {
    const chosen = selectedInSuffix[0]
    const idx = contentfulCandidates.indexOf(chosen)
    return { chosenCandidateIndex: idx, ambiguousResponseVersions: false }
  }
  if (selectedInSuffix.length > 1) {
    return { chosenCandidateIndex: null, ambiguousResponseVersions: true }
  }

  return { chosenCandidateIndex: null, ambiguousResponseVersions: true }
}
