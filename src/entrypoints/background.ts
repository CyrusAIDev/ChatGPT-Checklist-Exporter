import type {
  GetPageStateForActiveTabRequest,
  GetPageStateForActiveTabResponse,
  NavigateToConversationResponse,
  OpenChatUrlInNewTabResponse,
  PageStatePayload,
  ReloadActiveTabResponse,
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
      message:
        | GetPageStateForActiveTabRequest
        | { type: 'RELOAD_ACTIVE_TAB' }
        | { type: 'NAVIGATE_TO_CONVERSATION'; conversationId: string }
        | { type: 'OPEN_CHAT_URL_IN_NEW_TAB'; url: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (
        response:
          | GetPageStateForActiveTabResponse
          | ReloadActiveTabResponse
          | NavigateToConversationResponse
          | OpenChatUrlInNewTabResponse,
      ) => void,
    ) => {
      if (message.type === 'OPEN_CHAT_URL_IN_NEW_TAB') {
        try {
          const url = new URL(message.url)
          if (url.origin !== CHATGPT_ORIGIN) {
            sendResponse({ ok: false, error: 'not_chatgpt' })
            return false
          }
          if (!url.pathname.match(/^\/c\/[^/]+\/?$/)) {
            sendResponse({ ok: false, error: 'invalid_path' })
            return false
          }
          chrome.tabs.create({ url: message.url })
          sendResponse({ ok: true })
        } catch {
          sendResponse({ ok: false, error: 'invalid_url' })
        }
        return false
      }

      if (message.type === 'RELOAD_ACTIVE_TAB') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0]
          if (!tab || tab.id == null || !tab.url) {
            sendResponse({ ok: false, error: 'no_tab' })
            return
          }
          try {
            const url = new URL(tab.url)
            if (url.origin !== CHATGPT_ORIGIN) {
              sendResponse({ ok: false, error: 'not_chatgpt' })
              return
            }
            chrome.tabs.reload(tab.id)
            sendResponse({ ok: true })
          } catch {
            sendResponse({ ok: false, error: 'invalid_url' })
          }
        })
        return true
      }

      if (message.type === 'NAVIGATE_TO_CONVERSATION') {
        const conversationId = message.conversationId
        if (!conversationId || !/^[a-zA-Z0-9_-]+$/.test(conversationId)) {
          sendResponse({ ok: false, error: 'invalid_id' })
          return false
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0]
          if (!tab || tab.id == null) {
            sendResponse({ ok: false, error: 'no_tab' })
            return
          }
          try {
            const currentUrl = tab.url ? new URL(tab.url) : null
            if (!currentUrl || currentUrl.origin !== CHATGPT_ORIGIN) {
              sendResponse({ ok: false, error: 'not_chatgpt' })
              return
            }
            chrome.tabs.update(tab.id, { url: `https://chatgpt.com/c/${conversationId}` })
            sendResponse({ ok: true })
          } catch {
            sendResponse({ ok: false, error: 'invalid_url' })
          }
        })
        return true
      }

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
