/** Message contract: side panel -> background -> content script. */

export type PageStatePayload = {
  conversationId: string | null
  supported: boolean
  latestMessageText: string | null
  taskCandidates: string[]
  /** True when the latest assistant message is still streaming/generating; do not create or merge. */
  isGenerating: boolean
}

/** Sent to content script to get fresh page state on demand. */
export type GetPageStateRequest = { type: 'GET_PAGE_STATE' }

/** Side panel asks background to resolve active tab and get page state from that tab's content script. */
export type GetPageStateForActiveTabRequest = { type: 'GET_PAGE_STATE_FOR_ACTIVE_TAB' }

/** Background returns this to side panel. */
export type GetPageStateForActiveTabResponse =
  | { ok: true; payload: PageStatePayload }
  | { ok: false; error: 'not_chatgpt' | 'no_tab' | 'no_response' }
