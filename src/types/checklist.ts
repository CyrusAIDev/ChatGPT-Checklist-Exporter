export type ChecklistRecord = {
  version: 1
  conversationId: string
  sourceFingerprint: string | null
  updatedAt: number
  items: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
  archived: boolean
  order: number
}
