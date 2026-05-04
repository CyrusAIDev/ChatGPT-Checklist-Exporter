import { extractLatestAssistantMessage } from '../lib/chatgpt/extract-latest-assistant-message'
import { decodeSharePayload } from '../lib/export/share-url'
import type { GetPageStateRequest, ImportSharedPlanMessage } from '../types/messages'

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

    // Detect ?sharedplan= on page load and forward to side panel
    try {
      const url = new URL(window.location.href)
      const sharedPlan = url.searchParams.get('sharedplan')
      if (sharedPlan) {
        const payload = decodeSharePayload(sharedPlan)
        if (payload) {
          const msg: ImportSharedPlanMessage = { type: 'IMPORT_SHARED_PLAN', payload }
          chrome.runtime.sendMessage(msg)
          if (isDev()) console.log('[Living Checklist] Shared plan detected and forwarded', payload.title)
        }
      }
    } catch (e) {
      if (isDev()) console.log('[Living Checklist] sharedplan detection error', e)
    }
  },
})
