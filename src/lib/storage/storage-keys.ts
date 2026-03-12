export const CHECKLIST_KEY_PREFIX = 'checklist:'

export function checklistKey(conversationId: string): string {
  return `${CHECKLIST_KEY_PREFIX}${conversationId}`
}
