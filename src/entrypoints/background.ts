import type {
  GetPageStateForActiveTabRequest,
  GetPageStateForActiveTabResponse,
  PageStatePayload,
} from '../types/messages'

const CHATGPT_ORIGIN = 'https://chatgpt.com'

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
}

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.storage.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' })

  chrome.runtime.onMessage.addListener(
    (
      message: GetPageStateForActiveTabRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: GetPageStateForActiveTabResponse) => void,
    ) => {
      if (message.type !== 'GET_PAGE_STATE_FOR_ACTIVE_TAB') return false

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        if (!tab || tab.id == null || !tab.url) {
          if (isDev()) console.log('[Living Checklist] Active tab resolution: no tab')
          sendResponse({ ok: false, error: 'no_tab' })
          return
        }
        try {
          const url = new URL(tab.url)
          if (url.origin !== CHATGPT_ORIGIN) {
            if (isDev()) console.log('[Living Checklist] Active tab resolution: not chatgpt', tab.url)
            sendResponse({ ok: false, error: 'not_chatgpt' })
            return
          }
          if (isDev()) console.log('[Living Checklist] Active tab resolution: chatgpt tab', tab.id, tab.url)
          chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_STATE' }, (payload: PageStatePayload) => {
            if (chrome.runtime.lastError) {
              if (isDev()) console.log('[Living Checklist] Content script response error', chrome.runtime.lastError.message)
              sendResponse({ ok: false, error: 'no_response' })
              return
            }
            if (isDev()) console.log('[Living Checklist] Content script response ok', payload?.conversationId, 'assistant content:', payload?.taskCandidates?.length ?? 0, 'items')
            sendResponse({ ok: true, payload })
          })
        } catch (e) {
          if (isDev()) console.log('[Living Checklist] Active tab resolution error', e)
          sendResponse({ ok: false, error: 'not_chatgpt' })
        }
      })

      return true
    },
  )
})
