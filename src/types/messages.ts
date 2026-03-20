/** Message contract: side panel -> background -> content script. */

export type PageStatePayload = {
  conversationId: string | null
  supported: boolean
  latestMessageText: string | null
  taskCandidates: string[]
  /** From document title when available (e.g. thread name). */
  conversationTitle: string | null
  /** True when the latest assistant message is still streaming/generating; do not create or merge. */
  isGenerating: boolean
  /** True when multiple assistant response versions exist and one could not be chosen; do not guess. */
  ambiguousResponseVersions?: boolean
}

/** Sent to content script to get fresh page state on demand. */
export type GetPageStateRequest = { type: 'GET_PAGE_STATE' }

/** Side panel asks background to resolve active tab and get page state from that tab's content script. */
export type GetPageStateForActiveTabRequest = { type: 'GET_PAGE_STATE_FOR_ACTIVE_TAB' }

/** Background returns this to side panel. */
export type GetPageStateForActiveTabResponse =
  | { ok: true; payload: PageStatePayload }
  | { ok: false; error: 'not_chatgpt' | 'no_tab' | 'no_response' }

/** Side panel asks background to reload the active tab (e.g. after no_response). Only reloads if tab is ChatGPT. */
export type ReloadActiveTabRequest = { type: 'RELOAD_ACTIVE_TAB' }

export type ReloadActiveTabResponse = { ok: true } | { ok: false; error: string }

/** Side panel asks background to navigate the active tab to a ChatGPT conversation. Only if tab is already ChatGPT. */
export type NavigateToConversationRequest = { type: 'NAVIGATE_TO_CONVERSATION'; conversationId: string }

export type NavigateToConversationResponse = { ok: true } | { ok: false; error: string }

/** Open a ChatGPT URL in a new browser tab (library → original chat). */
export type OpenChatUrlInNewTabRequest = { type: 'OPEN_CHAT_URL_IN_NEW_TAB'; url: string }

export type OpenChatUrlInNewTabResponse = { ok: true } | { ok: false; error: string }
