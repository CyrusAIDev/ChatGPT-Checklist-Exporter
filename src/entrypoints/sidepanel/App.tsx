import { useEffect, useState } from 'react'
import type { ChecklistRecord } from '../../types/checklist'
import type { PageStatePayload, GetPageStateForActiveTabResponse, ReloadActiveTabResponse } from '../../types/messages'
import { getChecklist, setChecklist, deleteChecklist } from '../../lib/storage/checklist-repo'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'
import { mergeChecklist } from '../../lib/merge/merge-checklist'
import type { MergeSummary } from '../../lib/merge/merge-checklist'
import { ResetConfirmDialog } from '../../components/ResetConfirmDialog'
import { PanelHeader } from '../../components/PanelHeader'

type PageStateStatus = PageStatePayload | null | 'loading'
type PageStateError = 'not_chatgpt' | 'no_tab' | 'no_response' | null

const isDev = (): boolean =>
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

const PAGE_STATE_RETRY_ATTEMPTS = 3
const PAGE_STATE_RETRY_DELAY_MS = 400

function fetchPageStateOnce(): Promise<GetPageStateForActiveTabResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_PAGE_STATE_FOR_ACTIVE_TAB' },
      (response: GetPageStateForActiveTabResponse) =>
        resolve(response ?? { ok: false, error: 'no_response' }),
    )
  })
}

/** Fetch page state with retries on no_response (e.g. content script not ready after extension reload). */
async function fetchPageStateWithRetry(): Promise<GetPageStateForActiveTabResponse> {
  for (let attempt = 1; attempt <= PAGE_STATE_RETRY_ATTEMPTS; attempt++) {
    const response = await fetchPageStateOnce()
    if (response.ok || response.error !== 'no_response') return response
    if (attempt < PAGE_STATE_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, PAGE_STATE_RETRY_DELAY_MS))
    } else {
      return response
    }
  }
  return { ok: false, error: 'no_response' }
}

function fetchFreshPageState(): Promise<GetPageStateForActiveTabResponse> {
  return fetchPageStateWithRetry()
}

function App() {
  const [pageState, setPageState] = useState<PageStateStatus>('loading')
  const [pageError, setPageError] = useState<PageStateError>(null)
  const [checklist, setChecklistState] = useState<ChecklistRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [mergeSummary, setMergeSummary] = useState<MergeSummary | null>(null)
  const [archivedCollapsed, setArchivedCollapsed] = useState(true)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [refreshingTab, setRefreshingTab] = useState(false)

  const loadPageState = () => {
    setPageState('loading')
    setPageError(null)
    fetchPageStateWithRetry().then((response) => {
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
    })
  }

  useEffect(() => {
    loadPageState()
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
    setInfoMessage(null)
    try {
      const response = await fetchFreshPageState()
      if (!response.ok) {
        const msg = response.error === 'no_response' ? 'Couldn’t read the page. Try refreshing the tab.' : response.error === 'no_tab' ? 'No active tab. Open a conversation and try again.' : 'This page is not supported.'
        setError(msg)
        return
      }
      const fresh = response.payload
      if (!fresh.supported || !fresh.conversationId) {
        setError('This isn’t a saved conversation.')
        return
      }
      if (fresh.isGenerating) {
        setInfoMessage('Wait until ChatGPT finishes responding.')
        return
      }
      const parsed = parseLatestMessage(fresh)
      if (parsed.length === 0) {
        setError('No list items found in the latest message.')
        return
      }
      const record = createChecklistRecord(fresh.conversationId, parsed)
      await setChecklist(record)
      setChecklistState(record)
      setPageState(fresh)
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
    setInfoMessage(null)
    setMergeSummary(null)
    try {
      const response = await fetchFreshPageState()
      if (!response.ok) {
        const msg = response.error === 'no_response' ? 'Couldn’t read the page. Try refreshing the tab.' : response.error === 'no_tab' ? 'No active tab. Open a conversation and try again.' : 'This page is not supported.'
        setError(msg)
        return
      }
      const fresh = response.payload
      if (!fresh.supported || !fresh.conversationId) {
        setError('This isn’t a saved conversation.')
        return
      }
      if (fresh.isGenerating) {
        setInfoMessage('Wait until ChatGPT finishes responding.')
        return
      }
      if (fresh.conversationId !== checklist.conversationId) {
        setError('Conversation changed. Refresh the panel.')
        return
      }
      const parsed = parseLatestMessage(fresh)
      if (parsed.length === 0) {
        setError('No list items found in the latest message.')
        return
      }
      const result = mergeChecklist(checklist, parsed)
      if (result === null) {
        setInfoMessage('Already up to date.')
        return
      }
      await setChecklist(result.record)
      setChecklistState(result.record)
      setMergeSummary(result.summary)
      setPageState(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleRefreshPage = () => {
    setRefreshingTab(true)
    const fallback = setTimeout(() => setRefreshingTab(false), 3000)
    chrome.runtime.sendMessage(
      { type: 'RELOAD_ACTIVE_TAB' },
      (response: ReloadActiveTabResponse | undefined) => {
        clearTimeout(fallback)
        if (response?.ok === true) {
          setTimeout(() => {
            loadPageState()
            setRefreshingTab(false)
          }, 1500)
        } else {
          setRefreshingTab(false)
        }
      },
    )
  }

  const handleResetClick = () => setResetConfirmOpen(true)
  const handleResetCancel = () => setResetConfirmOpen(false)
  const handleResetConfirm = async () => {
    if (!pageState || pageState === 'loading' || !pageState.conversationId) return
    await deleteChecklist(pageState.conversationId)
    setChecklistState(null)
    setMergeSummary(null)
    setError(null)
    setInfoMessage(null)
    setArchivedCollapsed(true)
    setResetConfirmOpen(false)
  }

  if (pageState === 'loading') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-loading">Loading…</p>
        </div>
      </div>
    )
  }

  if (pageError === 'no_tab') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-unsupported">Open a saved ChatGPT conversation in this window, then open the panel again.</p>
        </div>
      </div>
    )
  }

  if (pageError === 'no_response') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-unsupported">Couldn’t read the page. The tab may still be loading or the extension was just reloaded.</p>
          <p className="state-unsupported" style={{ marginBottom: 0 }}>Refresh the ChatGPT tab, then try again—or use Retry below.</p>
          <div className="state-actions">
            <button type="button" className="btn-primary" onClick={handleRefreshPage} disabled={refreshingTab}>
              {refreshingTab ? 'Refreshing…' : 'Refresh page'}
            </button>
            <button type="button" className="btn-secondary" onClick={loadPageState} disabled={refreshingTab}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pageError === 'not_chatgpt') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-unsupported">This extension works only on ChatGPT. Open a conversation at chatgpt.com.</p>
        </div>
      </div>
    )
  }

  if (pageState === null) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-unsupported">Open a saved ChatGPT conversation, then open this panel.</p>
        </div>
      </div>
    )
  }

  if (!pageState.supported) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-unsupported">This isn’t a saved conversation. Use a URL like chatgpt.com/c/...</p>
        </div>
      </div>
    )
  }

  if (pageState.isGenerating) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-info">Wait until ChatGPT finishes responding before creating or merging a checklist.</p>
          <p className="state-no-content" style={{ marginBottom: 0 }}>Then create or update your checklist from the complete message.</p>
        </div>
      </div>
    )
  }

  const hasAssistantContent =
    (pageState.latestMessageText != null && pageState.latestMessageText.length > 0) ||
    (pageState.taskCandidates != null && pageState.taskCandidates.length > 0)

  if (!hasAssistantContent) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <div className="state-card">
          <p className="state-no-content">Conversation found, but there’s no assistant message yet. Scroll to the latest reply or send a message.</p>
        </div>
      </div>
    )
  }

  const activeItems = checklist?.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order) ?? []
  const archivedItems = checklist?.items.filter((i) => i.archived).sort((a, b) => a.order - b.order) ?? []
  const completedCount = activeItems.filter((i) => i.checked).length
  const totalCount = activeItems.length

  return (
    <div className="sidepanel">
      <PanelHeader />
      {error && <p className="state-error">{error}</p>}
      {infoMessage && <p className="state-info">{infoMessage}</p>}
      {!checklist ? (
        <div className="state-empty">
          <p>No checklist yet. Create one from the latest assistant message.</p>
          <button type="button" className="btn-primary" onClick={handleCreateChecklist} disabled={busy}>
            {busy ? 'Creating…' : 'Create checklist'}
          </button>
        </div>
      ) : (
        <div className="checklist-view">
          <div className="header-actions">
            <button type="button" className="btn-primary" onClick={handleMergeLatest} disabled={busy}>
              {busy ? 'Merging…' : 'Merge latest'}
            </button>
            <span className="header-actions-sep" aria-hidden="true" />
            <button type="button" className="btn-destructive" onClick={handleResetClick} disabled={busy}>
              Reset checklist
            </button>
          </div>
          {totalCount > 0 && (
            <p className="progress-summary" aria-live="polite">
              {completedCount} of {totalCount} completed
            </p>
          )}
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
              <div className="archived-section-header">
                <span className="archived-section-label">Archived</span>
                <button
                  type="button"
                  className="archived-toggle"
                  onClick={() => setArchivedCollapsed(!archivedCollapsed)}
                  aria-expanded={!archivedCollapsed}
                >
                  {archivedCollapsed ? '▼' : '▲'} {archivedCollapsed ? `${archivedItems.length} item${archivedItems.length !== 1 ? 's' : ''}` : 'Hide'}
                </button>
              </div>
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
          {resetConfirmOpen && (
            <div className="reset-dialog-backdrop">
              <ResetConfirmDialog onConfirm={handleResetConfirm} onCancel={handleResetCancel} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
