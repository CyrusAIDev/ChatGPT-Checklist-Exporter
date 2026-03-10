/* eslint-disable no-console */
import { onMessage } from 'webext-bridge'

console.info('[chrome-ext-mv3-starter] Hello world from content script')

// communication example: send previous tab title from background page
onMessage('tab-prev', ({ data }) => {
  console.log(`[chrome-ext-mv3-starter] Navigate from page "${data.title}"`)
})

type AssistantExtractionDebug = {
  url: string
  assistantNodeCount: number
  markdownNodeCount: number
}

type AssistantExtractionResult = {
  text: string | null
  taskCandidates: string[]
  debug: AssistantExtractionDebug
}

function extractTaskCandidatesFromMessage(message: HTMLElement): string[] {
  const listItems = Array.from(message.querySelectorAll('li')) as HTMLElement[]
  const candidates: string[] = []

  for (const item of listItems) {
    const text = item.innerText?.trim()
    if (text) candidates.push(text)
  }

  return candidates
}

function getLatestAssistantMessageText(): AssistantExtractionResult {
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]')
  const allMarkdownBlocks = Array.from(document.querySelectorAll('.markdown')) as HTMLElement[]
  const debug: AssistantExtractionDebug = {
    url: window.location.href,
    assistantNodeCount: assistantMessages.length,
    markdownNodeCount: allMarkdownBlocks.length
  }

  for (let i = assistantMessages.length - 1; i >= 0; i -= 1) {
    const message = assistantMessages[i] as HTMLElement
    const taskCandidates = extractTaskCandidatesFromMessage(message)

    // Prefer markdown-rendered content to avoid toolbar text noise.
    const markdownBlocks = Array.from(
      message.querySelectorAll('.markdown')
    ) as HTMLElement[]
    const markdownText = markdownBlocks
      .map((block) => block.innerText?.trim() || '')
      .filter((text) => text.length > 0)
      .join('\n')

    const fallbackText = message.innerText?.trim() || ''
    const text = markdownText || fallbackText
    if (taskCandidates.length > 0 || text.length > 0) {
      return { text, taskCandidates, debug }
    }
  }

  // Fallback: if assistant nodes are missing, use latest markdown block text.
  for (let i = allMarkdownBlocks.length - 1; i >= 0; i -= 1) {
    const text = allMarkdownBlocks[i].innerText?.trim()
    if (text && text.length > 0) return { text, taskCandidates: [], debug }
  }

  return { text: null, taskCandidates: [], debug }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_LATEST_ASSISTANT_MESSAGE_TEXT') return

  const { text, taskCandidates, debug } = getLatestAssistantMessageText()
  sendResponse({
    ok: Boolean(text),
    text,
    taskCandidates,
    debug
  })
})
