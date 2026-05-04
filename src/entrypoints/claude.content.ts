import type { GetPageStateRequest } from '../types/messages'
import type { PageStatePayload } from '../types/messages'

const isDev = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

/**
 * Content script for claude.ai — mirrors chatgpt.content.ts structure.
 * Only the DOM selector and conversation ID extraction differ; all
 * parsing and merge logic is reused unchanged in the side panel.
 */
export default defineContentScript({
  matches: ['https://claude.ai/*'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: GetPageStateRequest,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (payload: PageStatePayload) => void,
      ) => {
        if (message.type !== 'GET_PAGE_STATE') return false

        try {
          // Claude.ai renders assistant turns in [data-testid="assistant-message"]
          // Fall back to role="presentation" content blocks if selector yields nothing
          let msgs = document.querySelectorAll('[data-testid="assistant-message"]')
          if (msgs.length === 0) {
            msgs = document.querySelectorAll('.font-claude-message')
          }

          const last = msgs[msgs.length - 1] as HTMLElement | undefined
          const text = last?.innerText?.trim() ?? null

          // Extract conversation ID from URL: /chat/<id>
          const conversationId =
            window.location.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/)?.[1] ?? null

          const conversationTitle = document.title?.replace(' - Claude', '').trim() || null

          // Detect if Claude is still generating (stop button visible)
          const isGenerating =
            !!document.querySelector('[aria-label="Stop Response"]') ||
            !!document.querySelector('[data-testid="stop-button"]')

          const lines = text
            ? text.split('\n').filter((l) => l.trim().length > 0)
            : []

          const payload: PageStatePayload = {
            conversationId,
            supported: !!text && lines.length > 0,
            latestMessageText: text,
            taskCandidates: lines,
            conversationTitle,
            isGenerating,
          }

          if (isDev()) {
            console.log(
              '[Living Checklist] claude GET_PAGE_STATE',
              conversationId,
              'lines:',
              lines.length,
            )
          }

          sendResponse(payload)
        } catch (e) {
          if (isDev()) console.log('[Living Checklist] claude extraction error', e)
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
