/**
 * Derive conversationId from pathname. Only /c/:id is supported.
 * Returns null if path does not match.
 */
export function getConversationIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)\/?$/)
  return match ? match[1] : null
}
