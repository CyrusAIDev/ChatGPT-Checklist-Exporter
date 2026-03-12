/**
 * Token-overlap score for conservative fuzzy matching.
 * score = 2 * sharedTokenCount / (oldTokenCount + newTokenCount)
 * Require score >= 0.85 and best beats second-best by >= 0.10.
 */

export function tokenOverlapScore(normalizedOld: string, normalizedNew: string): number {
  if (!normalizedOld || !normalizedNew) return 0
  const a = new Set(normalizedOld.split(/\s+/).filter(Boolean))
  const b = new Set(normalizedNew.split(/\s+/).filter(Boolean))
  let shared = 0
  for (const t of a) {
    if (b.has(t)) shared++
  }
  const total = a.size + b.size
  if (total === 0) return 0
  return (2 * shared) / total
}

const FUZZY_THRESHOLD = 0.85
const FUZZY_MARGIN = 0.1

/**
 * Find the index in oldNormalizedList (only unused indices) that best matches newNormalized.
 * Returns -1 if no clear single best match (score < threshold or best doesn't beat second by margin).
 */
export function findBestFuzzyMatch(
  newNormalized: string,
  oldNormalizedList: string[],
  usedIndices: Set<number>,
): number {
  const scored = oldNormalizedList
    .map((oldNorm, idx) => ({ idx, score: tokenOverlapScore(oldNorm, newNormalized) }))
    .filter((x) => !usedIndices.has(x.idx))
  if (scored.length === 0) return -1
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (best.score < FUZZY_THRESHOLD) return -1
  const second = scored[1]
  if (second && best.score - second.score < FUZZY_MARGIN) return -1
  return best.idx
}
