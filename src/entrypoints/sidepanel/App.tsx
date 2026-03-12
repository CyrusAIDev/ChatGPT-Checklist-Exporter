import { useEffect, useState } from 'react'
import type { ChecklistRecord } from '../../types/checklist'
import type { PageStatePayload } from '../../types/messages'
import { getChecklist, setChecklist } from '../../lib/storage/checklist-repo'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'

type PageStateStatus = PageStatePayload | null | 'loading'
type PageStateError = 'not_chatgpt' | 'no_tab' | 'no_response' | null

const isDev = (): boolean =>
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

function App() {
  const [pageState, setPageState] = useState<PageStateStatus>('loading')
  const [pageError, setPageError] = useState<PageStateError>(null)
  const [checklist, setChecklistState] = useState<ChecklistRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPageState('loading')
    setPageError(null)
    chrome.runtime.sendMessage(
      { type: 'GET_PAGE_STATE_FOR_ACTIVE_TAB' },
      (response: import('../../types/messages').GetPageStateForActiveTabResponse) => {
        if (isDev()) {
          console.log('[Living Checklist] GET_PAGE_STATE_FOR_ACTIVE_TAB response', response)
        }
        if (response?.ok === true) {
          setPageState(response.payload)
          setPageError(null)
        } else {
          setPageState(null)
          setPageError(response?.ok === false ? response.error : 'no_response')
        }
      },
    )
  }, [])

  useEffect(() => {
    if (pageState && pageState !== 'loading' && pageState.supported && pageState.conversationId) {
      setError(null)
      getChecklist(pageState.conversationId).then(setChecklistState)
    } else {
      setChecklistState(null)
    }
  }, [pageState])

  const handleToggle = async (itemId: string) => {
    if (!checklist) return
    const nextItems = checklist.items.map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked } : i,
    )
    const nextRecord: ChecklistRecord = {
      ...checklist,
      items: nextItems,
      updatedAt: Date.now(),
    }
    await setChecklist(nextRecord)
    setChecklistState(nextRecord)
  }

  const handleCreateChecklist = async () => {
    if (!pageState || pageState === 'loading' || !pageState.supported || !pageState.conversationId) return
    setBusy(true)
    setError(null)
    try {
      const parsed = parseLatestMessage(pageState)
      if (parsed.length === 0) {
        setError('No list items found in the latest message.')
        return
      }
      const record = createChecklistRecord(pageState.conversationId, parsed)
      await setChecklist(record)
      setChecklistState(record)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create checklist.')
    } finally {
      setBusy(false)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p>Loading…</p>
      </div>
    )
  }

  if (pageError === 'no_tab' || pageError === 'no_response') {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p className="state-unsupported">Open a saved ChatGPT conversation, then open this panel.</p>
        {pageError === 'no_response' && (
          <p className="state-hint">If you’re already on a conversation, try refreshing the page and opening the panel again.</p>
        )}
      </div>
    )
  }

  if (pageError === 'not_chatgpt') {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p className="state-unsupported">This page is not a ChatGPT tab. Open a conversation at chatgpt.com/c/...</p>
      </div>
    )
  }

  if (pageState === null) {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p className="state-unsupported">Open a saved ChatGPT conversation, then open this panel.</p>
      </div>
    )
  }

  if (!pageState.supported) {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p className="state-unsupported">This page is not a saved conversation. Open a chat with a URL like chatgpt.com/c/...</p>
      </div>
    )
  }

  const hasAssistantContent =
    (pageState.latestMessageText != null && pageState.latestMessageText.length > 0) ||
    (pageState.taskCandidates != null && pageState.taskCandidates.length > 0)

  if (!hasAssistantContent) {
    return (
      <div className="sidepanel">
        <header><h1>Living Checklist</h1></header>
        <p className="state-no-content">Conversation detected. No assistant message content yet—scroll to the latest reply or send a message.</p>
      </div>
    )
  }

  const activeItems = checklist?.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order) ?? []

  return (
    <div className="sidepanel">
      <header><h1>Living Checklist</h1></header>
      {error && <p className="state-error">{error}</p>}
      {!checklist ? (
        <div className="state-empty">
          <p>No checklist yet. Create one from the latest assistant message.</p>
          <button type="button" onClick={handleCreateChecklist} disabled={busy}>
            {busy ? 'Creating…' : 'Create checklist'}
          </button>
        </div>
      ) : (
        <div className="checklist-view">
          <ul className="checklist-list">
            {activeItems.map((item) => (
              <li key={item.id} className="checklist-item">
                <label className="checklist-item-row">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggle(item.id)}
                  />
                  <span className={`item-text ${item.checked ? 'item-checked' : ''}`}>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
