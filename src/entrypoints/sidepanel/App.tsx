import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ChecklistRecord } from '../../types/checklist'
import type {
  PageStatePayload,
  GetPageStateForActiveTabResponse,
  ReloadActiveTabResponse,
  NavigateToConversationResponse,
  OpenChatUrlInNewTabResponse,
  OpenChatgptHomeResponse,
} from '../../types/messages'
import { getChecklist, setChecklist, deleteChecklist, listAllChecklists } from '../../lib/storage/checklist-repo'
import { supabase } from '../../lib/supabase/client'
import { syncRecord, deleteRecord, pullAndMergeAll } from '../../lib/supabase/sync'
import { AuthPrompt } from '../../components/AuthPrompt'
import { createChecklistRecord, parseLatestMessage } from '../../lib/chatgpt/parse-checklist'
import { generateMarkdownExport } from '../../lib/export/markdown-export'
import { encodeSharePayload } from '../../lib/export/share-url'
import type { ImportSharedPlanMessage } from '../../types/messages'
import { chatgptConversationUrl } from '../../lib/chatgpt/chat-url'
import { mergeChecklist } from '../../lib/merge/merge-checklist'
import type { MergeSummary } from '../../lib/merge/merge-checklist'
import {
  filterChecklistsByQuery,
  sortChecklistsByUpdatedDesc,
} from '../../lib/library/library-query'
import { ResetConfirmDialog } from '../../components/ResetConfirmDialog'
import { fetchOrganizeResult } from '../../lib/ai/cleanup'
import { PanelHeader, type ActiveOrigin } from '../../components/PanelHeader'
import { PanelViewSwitcher } from '../../components/PanelViewSwitcher'
import { PanelStateCard } from '../../components/PanelStateCard'
import { ArchivedChecklistSection } from '../../components/ArchivedChecklistSection'
import { ChecklistActionBar } from '../../components/ChecklistActionBar'
import { ChecklistActiveList } from '../../components/ChecklistActiveList'
import { ChecklistMetaStrip } from '../../components/ChecklistMetaStrip'
import { LibraryChecklistList } from '../../components/library/LibraryChecklistList'
import { LibraryChecklistDetail } from '../../components/library/LibraryChecklistDetail'
import { CompletionCard } from '../../components/CompletionCard'

type PageStateStatus = PageStatePayload | null | 'loading'
type PageStateError = 'not_chatgpt' | 'no_tab' | 'no_response' | null

const isDev = (): boolean =>
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

const CHATGPT_ORIGIN = 'https://chatgpt.com'
const CLAUDE_ORIGIN = 'https://claude.ai'
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
  activeOrigin?: ActiveOrigin
  children: ReactNode
}

function SidepanelLayout({ panelView, onPanelViewChange, activeOrigin, children }: SidepanelLayoutProps) {
  return (
    <div className="sidepanel">
      <PanelHeader activeOrigin={activeOrigin} />
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

  const [authUser, setAuthUser] = useState<User | null>(null)

  const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null)
  const [panelView, setPanelView] = useState<'chat' | 'library'>('chat')
  const [initialViewSet, setInitialViewSet] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryRecords, setLibraryRecords] = useState<ChecklistRecord[]>([])
  const [libraryDetailId, setLibraryDetailId] = useState<string | null>(null)
  const [libraryDetailRecord, setLibraryDetailRecord] = useState<ChecklistRecord | null>(null)

  const [organizeBusy, setOrganizeBusy] = useState(false)
  const [organizeUndo, setOrganizeUndo] = useState<ChecklistRecord | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [smartMerge, setSmartMerge] = useState(true)

  const refreshLibrary = useCallback(() => {
    listAllChecklists().then(setLibraryRecords)
  }, [])

  const syncAfterSave = useCallback((record: ChecklistRecord) => {
    if (authUser) syncRecord(record, authUser.id).catch(console.warn)
  }, [authUser])

  const syncAfterDelete = useCallback((conversationId: string) => {
    if (authUser) deleteRecord(conversationId, authUser.id).catch(console.warn)
  }, [authUser])

  const handleSignIn = useCallback(async (user: User) => {
    setAuthUser(user)
    await pullAndMergeAll(user.id)
    refreshLibrary()
  }, [refreshLibrary])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAuthUser(null)
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

  // Track the active tab URL for header branding
  const updateActiveTabUrl = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setActiveTabUrl(tabs[0]?.url ?? null)
    })
  }

  useEffect(() => {
    updateActiveTabUrl()
    loadPageState()
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthUser(data.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
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
      updateActiveTabUrl()
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
    syncAfterSave(nextRecord)
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
    syncAfterSave(nextRecord)
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
      syncAfterSave(record)
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
      let mergedRecord: ChecklistRecord = {
        ...result.record,
        conversationLabel: fresh.conversationTitle ?? result.record.conversationLabel,
        sourceStructure,
      }

      // Smart merge: re-run AI organizer if enabled and checklist already has groups
      if (smartMerge && authUser && checklist.groups?.length) {
        try {
          const mergedActiveItems = mergedRecord.items
            .filter(i => !i.archived)
            .sort((a, b) => a.order - b.order)
          mergedRecord = await applyOrganizeResult(mergedRecord, mergedActiveItems)
        } catch {
          // Silent fallback — show regular merge result if AI fails
        }
      }

      await setChecklist(mergedRecord)
      syncAfterSave(mergedRecord)
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

  const [shareWarning, setShareWarning] = useState<string | null>(null)
  const [importBanner, setImportBanner] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    if (!checklist) return
    const md = generateMarkdownExport(checklist)
    await navigator.clipboard.writeText(md)
  }, [checklist])

  const handleShare = useCallback(async (): Promise<'ok' | 'too_large'> => {
    if (!checklist) return 'ok'
    const { encoded, tooLarge } = encodeSharePayload(checklist)
    if (tooLarge) {
      setShareWarning('Plan too large to share as URL — use Export instead')
      return 'too_large'
    }
    const url = `https://chatgpt.com/?sharedplan=${encoded}`
    await navigator.clipboard.writeText(url)
    setShareWarning(null)
    return 'ok'
  }, [checklist])

  // Listen for IMPORT_SHARED_PLAN from chatgpt.content.ts
  useEffect(() => {
    const handler = (message: unknown) => {
      if (
        !message ||
        typeof message !== 'object' ||
        (message as ImportSharedPlanMessage).type !== 'IMPORT_SHARED_PLAN'
      ) return
      const msg = message as ImportSharedPlanMessage
      const { title, items } = msg.payload
      if (!items || items.length === 0) return

      // Build a synthetic conversation ID from a timestamp so it doesn't collide
      const syntheticId = `shared-${Date.now()}`
      const record = {
        version: 1 as const,
        conversationId: syntheticId,
        sourceFingerprint: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        sourceChatUrl: `https://chatgpt.com`,
        conversationLabel: title ?? 'Shared plan',
        sourceStructure: 'unordered' as const,
        items: items.map((item, idx) => ({
          id: `${syntheticId}-${idx}`,
          text: item.text,
          checked: item.checked,
          archived: false,
          order: idx,
        })),
      }
      setChecklist(record).then(() => {
        syncAfterSave(record)
        setChecklistState(record)
        refreshLibrary()
        setImportBanner('Shared plan imported')
        setTimeout(() => setImportBanner(null), 3000)
      })
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  const handleNewPlan = () => {
    chrome.runtime.sendMessage(
      { type: 'OPEN_CHATGPT_HOME' },
      (_response: OpenChatgptHomeResponse | undefined) => {
        // fire and forget
      },
    )
  }

  const handleArchiveCompleted = async () => {
    if (!checklist) return
    await deleteChecklist(checklist.conversationId)
    syncAfterDelete(checklist.conversationId)
    setChecklistState(null)
    setMergeSummary(null)
    setError(null)
    setInfoMessage(null)
    setArchivedCollapsed(true)
    refreshLibrary()
  }

  // ── AI Organize ──────────────────────────────────────────────────────────────
  const applyOrganizeResult = useCallback(async (
    base: ChecklistRecord,
    activeItemsSnap: typeof activeItems,
  ) => {
    const { groups, itemUpdates } = await fetchOrganizeResult(activeItemsSnap)
    const archiveSet = new Set(itemUpdates.flatMap(u => u.mergeIds))
    const textMap = new Map(itemUpdates.map(u => [u.keepId, u.text]))
    const groupIdMap = new Map(itemUpdates.map(u => [u.keepId, u.groupId]))
    const orderMap = new Map(itemUpdates.map(u => [u.keepId, u.order]))
    const nextItems = base.items.map(item => ({
      ...item, // preserves checked, archived — only text/groupId/order change
      text: textMap.get(item.id) ?? item.text,
      groupId: groupIdMap.get(item.id) ?? item.groupId,
      order: orderMap.get(item.id) ?? item.order,
      archived: item.archived || archiveSet.has(item.id),
    }))
    return { ...base, items: nextItems, groups, updatedAt: Date.now() } as ChecklistRecord
  }, [])

  const handleOrganize = async () => {
    if (!checklist || activeItems.length === 0) return
    setOrganizeBusy(true)
    setError(null)
    try {
      const nextRecord = await applyOrganizeResult(checklist, activeItems)
      const previous = checklist
      await setChecklist(nextRecord)
      syncAfterSave(nextRecord)
      setChecklistState(nextRecord)
      refreshLibrary()
      // Set undo — auto-expires after 30 s
      setOrganizeUndo(previous)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setOrganizeUndo(null), 30_000)
    } catch (e) {
      setError(`🪄 Organize failed: ${(e as Error).message}`)
    } finally {
      setOrganizeBusy(false)
    }
  }

  const handleOrganizeUndo = async () => {
    if (!organizeUndo) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    await setChecklist(organizeUndo)
    syncAfterSave(organizeUndo)
    setChecklistState(organizeUndo)
    refreshLibrary()
    setOrganizeUndo(null)
  }

  const handleToggleGroup = async (groupId: string) => {
    if (!checklist?.groups) return
    const nextGroups = checklist.groups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
    )
    const nextRecord: ChecklistRecord = { ...checklist, groups: nextGroups }
    await setChecklist(nextRecord)
    // No remote sync for collapse state — local only
    setChecklistState(nextRecord)
  }

  const handleResetClick = () => setResetConfirmOpen(true)
  const handleResetCancel = () => setResetConfirmOpen(false)
  const handleResetConfirm = async () => {
    if (!pageState || pageState === 'loading' || !pageState.conversationId) return
    await deleteChecklist(pageState.conversationId)
    syncAfterDelete(pageState.conversationId)
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

  const activeOrigin: ActiveOrigin = (() => {
    try {
      if (!activeTabUrl) return 'other'
      const origin = new URL(activeTabUrl).origin
      if (origin === CHATGPT_ORIGIN) return 'chatgpt'
      if (origin === CLAUDE_ORIGIN) return 'claude'
    } catch {
      // ignore
    }
    return 'other'
  })()

  if (panelView === 'library') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
          <>
            <AuthPrompt user={authUser} onSignIn={handleSignIn} onSignOut={handleSignOut} />
            <LibraryChecklistList
              records={sortedFilteredLibrary}
              search={librarySearch}
              onSearchChange={setLibrarySearch}
              onOpenDetail={handleLibraryOpenDetail}
              onOpenChatUrl={openChatInNewTab}
            />
          </>
        )}
      </SidepanelLayout>
    )
  }

  if (pageState === 'loading') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
        <PanelStateCard tone="muted">
          <p className="state-body">Checking this tab…</p>
        </PanelStateCard>
      </SidepanelLayout>
    )
  }

  if (pageError === 'no_tab') {
    return (
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
  const allDone = totalCount > 0 && completedCount === totalCount

  return (
    <SidepanelLayout panelView={panelView} onPanelViewChange={setPanelView} activeOrigin={activeOrigin}>
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
      {importBanner ? (
        <div className="state-banner state-banner--info" aria-live="polite">
          <p className="state-banner-text">{importBanner}</p>
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
      ) : allDone ? (
        <CompletionCard
          conversationLabel={checklist.conversationLabel}
          onArchive={handleArchiveCompleted}
          onNewPlan={handleNewPlan}
        />
      ) : (
        <div className="checklist-view">
          <ChecklistActionBar
            busy={busy}
            onMergeLatest={handleMergeLatest}
            onResetClick={handleResetClick}
            onExport={handleExport}
            onShare={handleShare}
            shareWarning={shareWarning}
            authUser={authUser}
            onOrganize={handleOrganize}
            organizeBusy={organizeBusy}
            smartMerge={smartMerge}
            onToggleSmartMerge={() => setSmartMerge(p => !p)}
          />
          {organizeUndo && (
            <div className="organize-undo-bar" role="status">
              <span>✓ Organized</span>
              <button type="button" className="organize-undo-btn" onClick={handleOrganizeUndo}>
                Undo
              </button>
              <button
                type="button"
                className="organize-undo-dismiss"
                onClick={() => setOrganizeUndo(null)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
          <ChecklistMetaStrip
            completedCount={completedCount}
            totalCount={totalCount}
            mergeSummary={mergeSummary}
          />
          <ChecklistActiveList
            items={activeItems}
            groups={checklist.groups}
            onToggle={handleToggle}
            onToggleGroup={handleToggleGroup}
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
