import { useEffect, useState } from 'react'
import type { ChecklistRecord } from '../../types/checklist'
import type {
  PageStatePayload,
  GetPageStateForActiveTabResponse,
  ReloadActiveTabResponse,
  NavigateToConversationResponse,
} from '../../types/messages'
import { getChecklist, setChecklist, deleteChecklist } from '../../lib/storage/checklist-repo'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'
import { mergeChecklist } from '../../lib/merge/merge-checklist'
import type { MergeSummary } from '../../lib/merge/merge-checklist'
import { ResetConfirmDialog } from '../../components/ResetConfirmDialog'
import { PanelHeader } from '../../components/PanelHeader'
import { PanelStateCard } from '../../components/PanelStateCard'
import { ArchivedChecklistSection } from '../../components/ArchivedChecklistSection'
import { ChecklistActionBar } from '../../components/ChecklistActionBar'
import { ChecklistActiveList } from '../../components/ChecklistActiveList'
import { ChecklistMetaStrip } from '../../components/ChecklistMetaStrip'

type PageStateStatus = PageStatePayload | null | 'loading'
type PageStateError = 'not_chatgpt' | 'no_tab' | 'no_response' | null

const isDev = (): boolean =>
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

const CHATGPT_ORIGIN = 'https://chatgpt.com'
const PAGE_STATE_RETRY_ATTEMPTS = 3
const PAGE_STATE_RETRY_DELAY_MS = 200
const RECOVERY_POLL_INTERVAL_MS = 500
const RECOVERY_POLL_MAX_ATTEMPTS = 6
const TAB_READY_DELAY_MS = 1800

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

/** Poll for page state until ok or max attempts. Used for recovery so panel can recover without reopening. */
async function pollPageState(
  intervalMs: number,
  maxAttempts: number,
): Promise<GetPageStateForActiveTabResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetchPageStateOnce()
    if (response.ok) return response
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs))
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

  /** Retry from no_response: poll until page state is available so recovery works without reopening panel. */
  const handleRetry = () => {
    setPageState('loading')
    setPageError(null)
    pollPageState(RECOVERY_POLL_INTERVAL_MS, RECOVERY_POLL_MAX_ATTEMPTS).then((response) => {
      if (response?.ok === true) {
        setPageState(response.payload)
        setPageError(null)
      } else {
        setPageState(null)
        setPageError(response?.ok === false ? response.error : 'no_response')
      }
    })
  }

  /** Re-fetch page state when the active ChatGPT tab becomes ready (e.g. after refresh). Clears refreshing state. */
  const reFetchFromTabReady = () => {
    setPageState('loading')
    setPageError(null)
    fetchPageStateWithRetry().then((response) => {
      if (isDev()) {
        console.log('[Living Checklist] tab-ready re-fetch response', response)
      }
      if (response?.ok === true) {
        setPageState(response.payload)
        setPageError(null)
      } else {
        setPageState(null)
        setPageError(response?.ok === false ? response.error : 'no_response')
      }
      setRefreshingTab(false)
    })
  }

  useEffect(() => {
    loadPageState()
  }, [])

  /** Subscribe to tab lifecycle so panel recovers when active ChatGPT tab becomes ready (e.g. after Refresh page) or user switches tab. */
  useEffect(() => {
    const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status !== 'complete') return
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url) return
        try {
          if (new URL(tab.url).origin !== CHATGPT_ORIGIN) return
        } catch {
          return
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
          const active = activeTabs[0]
          if (!active || active.id !== tabId) return
          /* Wait for ChatGPT to render before re-fetching; content script needs DOM ready. */
          setTimeout(reFetchFromTabReady, TAB_READY_DELAY_MS)
        })
      })
    }
    const onTabActivated = () => {
      reFetchFromTabReady()
    }
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onActivated.addListener(onTabActivated)
    return () => {
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onActivated.removeListener(onTabActivated)
    }
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
        const msg =
          response.error === 'no_response'
            ? 'Can’t read this tab. Refresh or try again.'
            : response.error === 'no_tab'
              ? 'No active tab. Open a saved thread and retry.'
              : 'This page isn’t supported here.'
        setError(msg)
        return
      }
      const fresh = response.payload
      if (!fresh.supported || !fresh.conversationId) {
        setError('Save the chat first (URL needs /c/…).')
        return
      }
      if (fresh.isGenerating) {
        setInfoMessage('Wait until the reply finishes, then try again.')
        return
      }
      const parsed = parseLatestMessage(fresh)
      if (parsed.length === 0) {
        setError('No list found in the latest assistant message.')
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
        const msg =
          response.error === 'no_response'
            ? 'Can’t read this tab. Refresh or try again.'
            : response.error === 'no_tab'
              ? 'No active tab. Open a saved thread and retry.'
              : 'This page isn’t supported here.'
        setError(msg)
        return
      }
      const fresh = response.payload
      if (!fresh.supported || !fresh.conversationId) {
        setError('Save the chat first (URL needs /c/…).')
        return
      }
      if (fresh.isGenerating) {
        setInfoMessage('Wait until the reply finishes, then try again.')
        return
      }
      if (fresh.conversationId !== checklist.conversationId) {
        return
      }
      const parsed = parseLatestMessage(fresh)
      if (parsed.length === 0) {
        setError('No list found in the latest assistant message.')
        return
      }
      const result = mergeChecklist(checklist, parsed)
      if (result === null) {
        setInfoMessage('Already matches the latest reply.')
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

  /** Refresh active tab; tab onUpdated(complete) listener will re-fetch and recover panel automatically. */
  const handleRefreshPage = () => {
    setRefreshingTab(true)
    setPageState('loading')
    setPageError(null)
    chrome.runtime.sendMessage(
      { type: 'RELOAD_ACTIVE_TAB' },
      (response: ReloadActiveTabResponse | undefined) => {
        if (response?.ok !== true) {
          setRefreshingTab(false)
          setPageState(null)
          setPageError('no_response')
        }
        /* When reload succeeds, tab will fire onUpdated(complete) and reFetchFromTabReady() runs. */
      },
    )
  }

  const handleOpenOriginalConversation = () => {
    if (!checklist?.conversationId) return
    setError(null)
    setInfoMessage(null)
    chrome.runtime.sendMessage(
      { type: 'NAVIGATE_TO_CONVERSATION', conversationId: checklist.conversationId },
      (response: NavigateToConversationResponse | undefined) => {
        if (response?.ok === true) {
          setTimeout(loadPageState, 2500)
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
        <PanelStateCard tone="muted">
          <p className="state-body">Checking this tab…</p>
        </PanelStateCard>
      </div>
    )
  }

  if (pageError === 'no_tab') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard>
          <p className="state-body">
            Open a saved ChatGPT thread in this window, then open the panel again.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (pageError === 'no_response') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard
          title="Can’t read this tab"
          actions={
            <>
              <button type="button" className="btn-primary" onClick={handleRefreshPage} disabled={refreshingTab}>
                {refreshingTab ? 'Refreshing…' : 'Refresh page'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleRetry} disabled={refreshingTab}>
                Retry
              </button>
            </>
          }
        >
          <p className="state-body">
            Tab may still be loading, or the add-on was just reloaded. Refresh the tab or use Retry.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (pageError === 'not_chatgpt') {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard>
          <p className="state-body">
            Right now this panel works with saved ChatGPT conversations. Open{' '}
            <span className="state-nowrap">chatgpt.com</span> when you’re ready.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (pageState === null) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard>
          <p className="state-body">
            Open a saved conversation (<span className="state-nowrap">chatgpt.com/c/…</span>) to create or update a
            checklist.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (!pageState.supported) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard>
          <p className="state-body">
            Saved conversations use a URL like <span className="state-nowrap">chatgpt.com/c/…</span>. Save this chat
            first.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (pageState.isGenerating) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard title="Reply in progress" tone="hold">
          <p className="state-body state-body--secondary">
            Wait for the answer to finish. Then capture or merge from that message.
          </p>
        </PanelStateCard>
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
        <PanelStateCard
          title="No assistant message in view yet"
          tone="info"
          actions={
            <>
              <button type="button" className="btn-primary" onClick={handleRetry} disabled={refreshingTab}>
                Retry
              </button>
              <button type="button" className="btn-secondary" onClick={handleRefreshPage} disabled={refreshingTab}>
                {refreshingTab ? 'Refreshing…' : 'Refresh page'}
              </button>
            </>
          }
        >
          <p className="state-body state-body--secondary">
            The page may still be loading, or scroll to the latest reply. Use Retry or Refresh page to try again.
          </p>
        </PanelStateCard>
      </div>
    )
  }

  if (checklist && pageState.conversationId !== checklist.conversationId) {
    return (
      <div className="sidepanel">
        <PanelHeader />
        <PanelStateCard
          title="Different conversation"
          actions={
            <button type="button" className="btn-primary" onClick={handleOpenOriginalConversation}>
              Open that chat
            </button>
          }
        >
          <p className="state-body">This checklist belongs to another thread. Switch chats to continue.</p>
        </PanelStateCard>
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
      {error ? (
        <div className="state-banner state-banner--error" role="alert">
          <p className="state-banner-text">{error}</p>
        </div>
      ) : null}
      {infoMessage ? (
        <div className="state-banner state-banner--info" aria-live="polite">
          <p className="state-banner-text">{infoMessage}</p>
        </div>
      ) : null}
      {!checklist ? (
        <PanelStateCard
          title="No checklist yet"
          actions={
            <button type="button" className="btn-primary" onClick={handleCreateChecklist} disabled={busy}>
              {busy ? 'Creating…' : 'Capture from latest reply'}
            </button>
          }
        >
          <p className="state-body state-body--secondary">
            Pulls tasks from the latest assistant message in this conversation.
          </p>
        </PanelStateCard>
      ) : (
        <div className="checklist-view">
          <ChecklistActionBar
            busy={busy}
            onMergeLatest={handleMergeLatest}
            onResetClick={handleResetClick}
          />
          <ChecklistMetaStrip
            completedCount={completedCount}
            totalCount={totalCount}
            mergeSummary={mergeSummary}
          />
          <ChecklistActiveList items={activeItems} onToggle={handleToggle} />
          <ArchivedChecklistSection
            items={archivedItems}
            collapsed={archivedCollapsed}
            onToggleCollapsed={() => setArchivedCollapsed(!archivedCollapsed)}
          />
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
