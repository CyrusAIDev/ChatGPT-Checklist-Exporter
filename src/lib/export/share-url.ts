import type { ChecklistRecord } from '../../types/checklist'

export const SHARE_PAYLOAD_MAX_CHARS = 4000

export type SharedPlanPayload = {
  title: string | null
  items: Array<{ text: string; checked: boolean }>
}

/**
 * Encodes the active items of a checklist into a base64 URL parameter.
 * Returns { encoded, tooLarge } — caller must check tooLarge before using.
 */
export function encodeSharePayload(record: ChecklistRecord): { encoded: string; tooLarge: boolean } {
  const payload: SharedPlanPayload = {
    title: record.conversationLabel ?? null,
    items: record.items
      .filter((i) => !i.archived)
      .sort((a, b) => a.order - b.order)
      .map((i) => ({ text: i.text, checked: i.checked })),
  }

  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)))
  return { encoded, tooLarge: encoded.length > SHARE_PAYLOAD_MAX_CHARS }
}

/**
 * Decodes a base64 URL parameter back into a SharedPlanPayload.
 * Returns null if decoding or parsing fails.
 */
export function decodeSharePayload(raw: string): SharedPlanPayload | null {
  try {
    const json = decodeURIComponent(atob(raw))
    const parsed = JSON.parse(json) as unknown
    if (!isSharedPlanPayload(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function isSharedPlanPayload(val: unknown): val is SharedPlanPayload {
  if (!val || typeof val !== 'object') return false
  const v = val as Record<string, unknown>
  if (!Array.isArray(v.items)) return false
  return v.items.every(
    (i) => typeof i === 'object' && i !== null && typeof (i as Record<string, unknown>).text === 'string',
  )
}
