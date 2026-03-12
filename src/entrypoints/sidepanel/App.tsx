import { useEffect, useState } from 'react'
import type { ChecklistRecord } from '../../types/checklist'
import type { PageStatePayload } from '../../types/messages'
import { getChecklist, setChecklist } from '../../lib/storage/checklist-repo'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'
import { mergeChecklist } from '../../lib/merge/merge-checklist'
import type { MergeSummary } from '../../lib/merge/merge-checklist'

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
  const [mergeSummary, setMergeSummary] = useState<MergeSummary | null>(null)
  const [archivedCollapsed, setArchivedCollapsed] = useState(true)

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

  const handleMergeLatest = async () => {
    if (!pageState || pageState === 'loading' || !pageState.supported || !pageState.conversationId || !checklist) return
    setBusy(true)
    setError(null)
    setMergeSummary(null)
    try {
      const parsed = parseLatestMessage(pageState)
      if (parsed.length === 0) {
        setError('No list items found in the latest message.')
        return
      }
      const result = mergeChecklist(checklist, parsed)
      if (result === null) {
        setError('Already up to date.')
        return
      }
      await setChecklist(result.record)
      setChecklistState(result.record)
      setMergeSummary(result.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed.')
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
  const archivedItems = checklist?.items.filter((i) => i.archived).sort((a, b) => a.order - b.order) ?? []

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
          <div className="header-actions">
            <button type="button" onClick={handleMergeLatest} disabled={busy}>
              {busy ? 'Merging…' : 'Merge latest'}
            </button>
          </div>
          {mergeSummary && (
            <p className="merge-summary">
              Matched: {mergeSummary.matched}, added: {mergeSummary.added}, archived: {mergeSummary.archived}
            </p>
          )}
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
          {archivedItems.length > 0 && (
            <div className="archived-section">
              <button
                type="button"
                className="archived-toggle"
                onClick={() => setArchivedCollapsed(!archivedCollapsed)}
                aria-expanded={!archivedCollapsed}
              >
                {archivedCollapsed ? '▼' : '▲'} Archived ({archivedItems.length})
              </button>
              {!archivedCollapsed && (
                <ul className="checklist-list archived-list">
                  {archivedItems.map((item) => (
                    <li key={item.id} className="checklist-item archived-item">
                      <span className="item-text item-archived">{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
