import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ChecklistRecord } from '../../types/checklist'
import type {
  PageStatePayload,
  GetPageStateForActiveTabResponse,
  ReloadActiveTabResponse,
  NavigateToConversationResponse,
  OpenChatUrlInNewTabResponse,
} from '../../types/messages'
import { getChecklist, setChecklist, deleteChecklist, listAllChecklists } from '../../lib/storage/checklist-repo'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'
import { chatgptConversationUrl } from '../../lib/chatgpt/chat-url'
import { mergeChecklist } from '../../lib/merge/merge-checklist'
import type { MergeSummary } from '../../lib/merge/merge-checklist'
import {
  filterChecklistsByQuery,
  sortChecklistsByUpdatedDesc,
} from '../../lib/library/library-query'
import { ResetConfirmDialog } from '../../components/ResetConfirmDialog'
import { PanelHeader } from '../../components/PanelHeader'
import { PanelViewSwitcher } from '../../components/PanelViewSwitcher'
import { PanelStateCard } from '../../components/PanelStateCard'
import { ArchivedChecklistSection } from '../../components/ArchivedChecklistSection'
import { ChecklistActionBar } from '../../components/ChecklistActionBar'
import { ChecklistActiveList } from '../../components/ChecklistActiveList'
import { ChecklistMetaStrip } from '../../components/ChecklistMetaStrip'
import { LibraryChecklistList } from '../../components/library/LibraryChecklistList'
import { LibraryChecklistDetail } from '../../components/library/LibraryChecklistDetail'

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

type SidepanelLayoutProps = {
  panelView: 'chat' | 'library'
  onPanelViewChange: (v: 'chat' | 'library') => void
  children: ReactNode
}

function SidepanelLayout({ panelView, onPanelViewChange, children }: SidepanelLayoutProps) {
  return (
    <div className="sidepanel">
      <PanelHeader />
      <PanelViewSwitcher value={panelView} onChange={onPanelViewChange} />
      {children}
    </div>
  )
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

  const [panelView, setPanelView] = useState<'chat' | 'library'>('chat')
  const [initialViewSet, setInitialViewSet] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryRecords, setLibraryRecords] = useState<ChecklistRecord[]>([])
  const [libraryDetailId, setLibraryDetailId] = useState<string | null>(null)
  const [libraryDetailRecord, setLibraryDetailRecord] = useState<ChecklistRecord | null>(null)

  const refreshLibrary = useCallback(() => {
    listAllChecklists().then(setLibraryRecords)
  }, [])

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

  const handleCheckAgain = () => {
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

  useEffect(() => {
    if (initialViewSet) return
    if (pageState === 'loading') return
    if (pageError === 'not_chatgpt' || pageError === 'no_tab') {
      setPanelView('library')
    }
    setInitialViewSet(true)
  }, [pageState, pageError, initialViewSet])

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

  useEffect(() => {
    if (panelView !== 'library') return
    refreshLibrary()
  }, [panelView, refreshLibrary])

  useEffect(() => {
    if (panelView !== 'library' || !libraryDetailId) {
      setLibraryDetailRecord(null)
      return
    }
    getChecklist(libraryDetailId).then((r) => {
      if (r) {
        setLibraryDetailRecord(r)
      } else {
        setLibraryDetailId(null)
        setLibraryDetailRecord(null)
      }
    })
  }, [panelView, libraryDetailId])

  const openChatInNewTab = (url: string) => {
    chrome.runtime.sendMessage(
      { type: 'OPEN_CHAT_URL_IN_NEW_TAB', url },
      (response: OpenChatUrlInNewTabResponse | undefined) => {
        if (response?.ok !== true && isDev()) {
          console.warn('[Living Checklist] OPEN_CHAT_URL_IN_NEW_TAB failed', response)
        }
      },
    )
  }

  const handleLibraryOpenDetail = (conversationId: string) => {
    setLibraryDetailId(conversationId)
  }

  const handleLibraryBack = () => {
    setLibraryDetailId(null)
    setLibraryDetailRecord(null)
    refreshLibrary()
  }

  const handleLibraryItemToggle = async (itemId: string) => {
    if (!libraryDetailRecord) return
    const nextItems = libraryDetailRecord.items.map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked } : i,
    )
    const nextRecord: ChecklistRecord = {
      ...libraryDetailRecord,
      items: nextItems,
      updatedAt: Date.now(),
    }
    await setChecklist(nextRecord)
    setLibraryDetailRecord(nextRecord)
    setLibraryRecords((prev) =>
      prev.map((r) => (r.conversationId === nextRecord.conversationId ? nextRecord : r)),
    )
    if (
      pageState &&
      pageState !== 'loading' &&
      pageState.conversationId === nextRecord.conversationId
    ) {
      setChecklistState(nextRecord)
    }
  }

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
    if (libraryDetailId === checklist.conversationId) {
      setLibraryDetailRecord(nextRecord)
    }
    setLibraryRecords((prev) =>
      prev.map((r) => (r.conversationId === nextRecord.conversationId ? nextRecord : r)),
    )
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
      const { items: parsedItems, sourceStructure } = parseLatestMessage(fresh)
      if (parsedItems.length === 0) {
        setError('No list found in the latest assistant message.')
        return
      }
      const record = createChecklistRecord(fresh.conversationId, parsedItems, {
        sourceChatUrl: chatgptConversationUrl(fresh.conversationId),
        conversationLabel: fresh.conversationTitle,
        sourceStructure,
      })
      await setChecklist(record)
      setChecklistState(record)
      setPageState(fresh)
      refreshLibrary()
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
      const { items: parsedItems, sourceStructure } = parseLatestMessage(fresh)
      if (parsedItems.length === 0) {
        setError('No list found in the latest assistant message.')
        return
      }
      const result = mergeChecklist(checklist, parsedItems)
      if (result === null) {
        setInfoMessage('Already matches the latest reply.')
        return
      }
      const mergedRecord: ChecklistRecord = {
        ...result.record,
        conversationLabel: fresh.conversationTitle ?? result.record.conversationLabel,
        sourceStructure,
      }
      await setChecklist(mergedRecord)
      setChecklistState(mergedRecord)
      setMergeSummary(result.summary)
      setPageState(fresh)
      refreshLibrary()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed.')
    } finally {
      setBusy(false)
    }
  }

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
    refreshLibrary()
  }

  const sortedFilteredLibrary = sortChecklistsByUpdatedDesc(
    filterChecklistsByQuery(libraryRecords, librarySearch),
  )

  if (panelView === 'library') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        {error ? (
          <div className="state-banner state-banner--error" role="alert">
            <p className="state-banner-text">{error}</p>
          </div>
        ) : null}
        {libraryDetailId && libraryDetailRecord ? (
          <LibraryChecklistDetail
            record={libraryDetailRecord}
            onBack={handleLibraryBack}
            onToggleItem={handleLibraryItemToggle}
            onOpenChatInNewTab={openChatInNewTab}
          />
        ) : libraryDetailId ? (
          <PanelStateCard tone="muted">
            <p className="state-body">Opening checklist…</p>
          </PanelStateCard>
        ) : (
          <LibraryChecklistList
            records={sortedFilteredLibrary}
            search={librarySearch}
            onSearchChange={setLibrarySearch}
            onOpenDetail={handleLibraryOpenDetail}
            onOpenChatUrl={openChatInNewTab}
          />
        )}
      </SidepanelLayout>
    )
  }

  if (pageState === 'loading') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard tone="muted">
          <p className="state-body">Checking this tab…</p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageError === 'no_tab') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard>
          <p className="state-body">
            Open a saved ChatGPT thread in this window for capture, or use Library to open a saved checklist.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageError === 'no_response') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard
          title="Can’t read this tab"
          actions={
            <>
              <button type="button" className="btn-primary" onClick={handleRefreshPage} disabled={refreshingTab}>
                {refreshingTab ? 'Refreshing…' : 'Refresh page'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCheckAgain} disabled={refreshingTab}>
                Check again
              </button>
            </>
          }
        >
          <p className="state-body">
            Tab may still be loading, or the add-on was just reloaded. Refresh the tab or use Check again. You can also
            use Library anytime.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageError === 'not_chatgpt') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard>
          <p className="state-body">
            Capture and merge run on saved ChatGPT threads. Switch to Library to continue checklists you already saved,
            or open <span className="state-nowrap">chatgpt.com</span> when you’re ready.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageState === null) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard>
          <p className="state-body">
            Open a saved conversation (<span className="state-nowrap">chatgpt.com/c/…</span>) to create or update a
            checklist, or use Library for saved lists.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (!pageState.supported) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard>
          <p className="state-body">
            Saved conversations use a URL like <span className="state-nowrap">chatgpt.com/c/…</span>. Save this chat
            first. Library still has your other saved checklists.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageState.isGenerating) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard title="Reply in progress" tone="hold">
          <p className="state-body state-body--secondary">
            Wait for the answer to finish. Then capture or merge from that message.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageState.ambiguousResponseVersions) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard
          title="Choose a response version"
          tone="info"
          actions={
            <button type="button" className="btn-primary" onClick={handleCheckAgain}>
              Check again
            </button>
          }
        >
          <p className="state-body state-body--secondary">
            ChatGPT is showing multiple reply versions. Select the one you want, then check again.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  const hasAssistantContent =
    (pageState.latestMessageText != null && pageState.latestMessageText.length > 0) ||
    (pageState.taskCandidates != null && pageState.taskCandidates.length > 0) ||
    (pageState.htmlListItems != null && pageState.htmlListItems.length > 0)

  if (!hasAssistantContent) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
        <PanelStateCard
          title="No assistant message in view yet"
          tone="info"
          actions={
            <>
              <button type="button" className="btn-primary" onClick={handleRefreshPage} disabled={refreshingTab}>
                {refreshingTab ? 'Refreshing…' : 'Refresh page'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCheckAgain} disabled={refreshingTab}>
                Check again
              </button>
            </>
          }
        >
          <p className="state-body state-body--secondary">
            The page may still be loading, or scroll to the latest reply. Refresh page or Check again to try again.
          </p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (checklist && pageState.conversationId !== checklist.conversationId) {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
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
      </SidepanelLayout>
    )
  }

  const activeItems = checklist?.items.filter((i) => !i.archived).sort((a, b) => a.order - b.order) ?? []
  const archivedItems = checklist?.items.filter((i) => i.archived).sort((a, b) => a.order - b.order) ?? []
  const completedCount = activeItems.filter((i) => i.checked).length
  const totalCount = activeItems.length

  return (
    <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView}>
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
          <ChecklistActiveList
            items={activeItems}
            onToggle={handleToggle}
            sourceStructure={checklist.sourceStructure ?? 'unordered'}
          />
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
    </SidepanelLayout>
  )
}

export default App
