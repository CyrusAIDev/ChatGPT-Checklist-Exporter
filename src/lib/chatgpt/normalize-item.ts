/**
 * Normalize item text for matching and dedupe: lowercase, trim, remove list/checkbox
 * prefixes, collapse internal whitespace, strip trailing punctuation.
 */
export function normalizeItemText(raw: string): string {
  let s = raw.trim().toLowerCase()
  // Remove list and checkbox prefixes (strip bullets/numbers first so [ ] at start)
  s = s.replace(/^[\d]+\.[\s)]*\s*/, '').replace(/^[\d]+\)\s*/, '')
  s = s.replace(/^[-*•]\s*/, '')
  s = s.replace(/^\[x\]\s*/i, '').replace(/^\[\s?\]\s*/i, '')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/[.,;:!?]+$/, '').trim()
  return s
}
