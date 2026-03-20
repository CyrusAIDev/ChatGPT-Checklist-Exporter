import { extractLatestAssistantMessage } from '../lib/chatgpt/extract-latest-assistant-message'
import type { GetPageStateRequest } from '../types/messages'

const isDev = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener(
      (message: GetPageStateRequest, _sender: chrome.runtime.MessageSender, sendResponse: (payload: ReturnType<typeof extractLatestAssistantMessage>) => void) => {
        if (message.type !== 'GET_PAGE_STATE') return false
        try {
          const payload = extractLatestAssistantMessage()
          if (isDev()) {
            console.log('[Living Checklist] GET_PAGE_STATE response', payload.conversationId, 'assistant items:', payload.taskCandidates?.length ?? 0)
          }
          sendResponse(payload)
        } catch (e) {
          if (isDev()) console.log('[Living Checklist] extraction error', e)
          sendResponse({
            conversationId: null,
            supported: false,
            latestMessageText: null,
            taskCandidates: [],
            conversationTitle: null,
            isGenerating: false,
          })
        }
        return true
      },
    )
  },
})
