/** Last captured/merged list shape in ChatGPT; drives step markers (not merge identity). */
export type ChecklistSourceStructure = 'ordered' | 'unordered' | 'checkbox' | 'mixed'

export type ChecklistRecord = {
  version: 1
  conversationId: string
  sourceFingerprint: string | null
  updatedAt: number
  /** First save time; backfilled from updatedAt for legacy records. */
  createdAt: number
  /** Canonical ChatGPT thread URL (open in new tab). */
  sourceChatUrl: string
  /** Title from ChatGPT when captured; may be empty for older saves. */
  conversationLabel: string | null
  /** Omitted on legacy saves; treated as unordered in UI. */
  sourceStructure?: ChecklistSourceStructure
  items: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
  archived: boolean
  order: number
}
