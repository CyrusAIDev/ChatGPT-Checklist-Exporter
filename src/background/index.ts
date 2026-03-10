import { sendMessage, onMessage } from 'webext-bridge'

chrome.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let previousTabId = 0
const workerStartedAt = new Date().toISOString()

function getOauthDebugContext() {
  const runtimeManifest = chrome.runtime.getManifest()
  const oauth2 = runtimeManifest.oauth2

  return {
    extensionId: chrome.runtime.id,
    clientId: oauth2?.client_id,
    scopes: oauth2?.scopes || []
  }
}

function stringifyErrorMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (value instanceof Error && value.message) return value.message
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getAuthTokenInteractive(scopes: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true, scopes }, (token) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError || !token) {
        reject(new Error(runtimeError?.message || 'No auth token returned'))
        return
      }
      resolve(token)
    })
  })
}

async function googleApiFetch(
  token: string,
  url: string,
  init: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  })
}

type CreateSheetResult = {
  spreadsheetId: string
  spreadsheetUrl: string
  firstSheetId: number
}

async function createChecklistSheet(token: string): Promise<CreateSheetResult> {
  const createResponse = await googleApiFetch(
    token,
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title: 'ChatGPT Checklist' }
      })
    }
  )

  if (!createResponse.ok) {
    const createError = await createResponse.text()
    throw new Error(`Failed to create spreadsheet: ${createError}`)
  }

  const createdSheet = (await createResponse.json()) as {
    spreadsheetId?: string
    spreadsheetUrl?: string
    sheets?: Array<{
      properties?: {
        sheetId?: number
      }
    }>
  }

  const firstSheetId = createdSheet.sheets?.[0]?.properties?.sheetId

  if (!createdSheet.spreadsheetId || !createdSheet.spreadsheetUrl || firstSheetId == null) {
    throw new Error('Google Sheets API did not return spreadsheet details.')
  }

  return {
    spreadsheetId: createdSheet.spreadsheetId,
    spreadsheetUrl: createdSheet.spreadsheetUrl,
    firstSheetId
  }
}

async function writeChecklistRows(
  token: string,
  spreadsheetId: string,
  tasks: string[]
): Promise<void> {
  const rows = [['Task', 'Done', 'Notes'], ...tasks.map((task) => [task, false, ''])]

  const headersResponse = await googleApiFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:C${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        values: rows
      })
    }
  )

  if (!headersResponse.ok) {
    const headerError = await headersResponse.text()
    throw new Error(`Failed to write headers: ${headerError}`)
  }
}

async function enableDoneColumnCheckboxes(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  taskCount: number
): Promise<void> {
  if (taskCount <= 0) return

  const checkboxResponse = await googleApiFetch(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: taskCount + 1,
                startColumnIndex: 1,
                endColumnIndex: 2
              },
              rule: {
                condition: { type: 'BOOLEAN' },
                strict: true,
                showCustomUi: true
              }
            }
          }
        ]
      })
    }
  )

  if (!checkboxResponse.ok) {
    const checkboxError = await checkboxResponse.text()
    throw new Error(`Failed to enable checkboxes: ${checkboxError}`)
  }
}

function parseChecklistTasks(text: string): string[] {
  const lines = text.split('\n')
  const tasks: string[] = []

  for (const line of lines) {
    // ChatGPT often renders markdown bullets as "•" and numbered lists as "1)".
    const match = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/)
    if (!match) continue

    const parsedTask = match[1].replace(/^\[[ xX]\]\s*/, '').trim()
    if (parsedTask.length > 0) tasks.push(parsedTask)
  }

  return tasks
}

function isObviousNonTaskHeading(line: string): boolean {
  const normalized = line.trim().replace(/\s+/g, ' ').toLowerCase()
  return /^(?:\d+[.)]\s*)?(?:hyphen bullets|asterisk bullets|numbered list|mixed formatting|non-task noise(?: \(for parser robustness\))?)$/.test(
    normalized
  )
}

function sanitizeTaskCandidates(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isObviousNonTaskHeading(line))
    .map((line) => line.replace(/^\[[ xX]\]\s*/, '').trim())
    .filter((line) => line.length > 0)
}

function dedupeTasksPreserveOrder(tasks: string[]): string[] {
  const seen = new Set<string>()
  const uniqueTasks: string[] = []

  for (const task of tasks) {
    const key = task.trim().replace(/\s+/g, ' ').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    uniqueTasks.push(task)
  }

  return uniqueTasks
}

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0])
    })
  })
}

function isReceivingEndError(message: string): boolean {
  return /Receiving end does not exist/i.test(message)
}

function sendLatestAssistantMessageRequest(tabId: number): Promise<{
  ok: boolean
  text?: string
  taskCandidates?: string[]
  debug?: unknown
}> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'GET_LATEST_ASSISTANT_MESSAGE_TEXT' },
      (response?: { ok: boolean; text?: string; taskCandidates?: string[]; debug?: unknown }) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          reject(new Error(runtimeError.message))
          return
        }
        resolve(response || { ok: false })
      }
    )
  })
}

function injectContentScriptIntoTab(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['content/index.global.js']
      },
      () => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          reject(new Error(runtimeError.message))
          return
        }
        resolve()
      }
    )
  })
}

type AssistantExtractionResponse = {
  text: string
  taskCandidates: string[]
  debug?: unknown
}

async function requestLatestAssistantExtraction(
  tabId: number
): Promise<AssistantExtractionResponse> {
  let response:
    | { ok: boolean; text?: string; taskCandidates?: string[]; debug?: unknown }
    | undefined
  try {
    response = await sendLatestAssistantMessageRequest(tabId)
  } catch (error) {
    const message = stringifyErrorMessage(error)
    if (!isReceivingEndError(message)) {
      throw new Error(`No assistant message found: ${message}`)
    }

    // Recovery path: tab wasn't connected to content script yet.
    await injectContentScriptIntoTab(tabId)
    response = await sendLatestAssistantMessageRequest(tabId)
  }

  if (!response?.ok || !response.text || response.text.trim().length === 0) {
    const debugDetail = response?.debug ? ` | debug: ${stringifyErrorMessage(response.debug)}` : ''
    throw new Error(`No assistant message found${debugDetail}`)
  }

  return {
    text: response.text,
    taskCandidates: response.taskCandidates || [],
    debug: response.debug
  }
}

// communication example: send previous tab title from background page
// see shim.d.ts for type decleration
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }
  const tab = await chrome.tabs.get(previousTabId)
  previousTabId = tabId
  if (!tab) return

  // eslint-disable-next-line no-console
  console.log('previous tab', tab)
  void sendMessage(
    'tab-prev',
    { title: tab.title },
    { context: 'content-script', tabId }
  ).catch((error) => {
    // Expected when current tab has no injected content script.
    // eslint-disable-next-line no-console
    console.debug('[bridge] No content-script receiver for tab', tabId, error)
  })
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await chrome.tabs.get(previousTabId)
    return {
      title: tab?.id
    }
  } catch {
    return {
      title: undefined
    }
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'DEBUG_STATUS') {
    const manifestVersion = chrome.runtime.getManifest().version
    sendResponse({
      ok: true,
      version: manifestVersion,
      runtimeVersion: `${manifestVersion}+${workerStartedAt}`,
      workerStartedAt
    })
    return
  }

  if (message?.type === 'AUTH_TEST') {
    const { extensionId, clientId, scopes } = getOauthDebugContext()
    // eslint-disable-next-line no-console
    console.log('[auth] Starting OAuth test', { extensionId, clientId, scopes })

    void (async () => {
      try {
        const token = await getAuthTokenInteractive(scopes)
        // eslint-disable-next-line no-console
        console.log('[auth] Token acquired', {
          tokenLength: token.length,
          extensionId,
          clientId,
          scopes
        })
        sendResponse({
          ok: true,
          tokenLength: token.length,
          extensionId,
          clientId,
          scopes
        })
      } catch (error) {
        const errorMessage = stringifyErrorMessage(error)
        // eslint-disable-next-line no-console
        console.error('[auth] Failed to get token', {
          errorMessage,
          extensionId,
          clientId,
          scopes
        })
        sendResponse({ ok: false, error: errorMessage, extensionId, clientId, scopes })
      }
    })()

    return true
  }

  if (message?.type === 'CREATE_EMPTY_CHECKLIST_SHEET') {
    const { scopes } = getOauthDebugContext()
    // eslint-disable-next-line no-console
    console.log('[sheets] Creating empty checklist sheet')

    void (async () => {
      try {
        const token = await getAuthTokenInteractive(scopes)
        const { spreadsheetUrl } = await createChecklistSheet(token)
        await chrome.tabs.create({ url: spreadsheetUrl })
        // eslint-disable-next-line no-console
        console.log('[sheets] Checklist sheet created successfully', { spreadsheetUrl })
        sendResponse({
          ok: true,
          url: spreadsheetUrl
        })
      } catch (error) {
        const errorMessage = stringifyErrorMessage(error)
        // eslint-disable-next-line no-console
        console.error('[sheets] Failed to create checklist sheet', { errorMessage })
        sendResponse({
          ok: false,
          error: errorMessage
        })
      }
    })()

    return true
  }

  if (message?.type === 'EXPORT_LAST_ANSWER_TO_SHEET') {
    const { scopes } = getOauthDebugContext()
    // eslint-disable-next-line no-console
    console.log('[sheets] Exporting latest assistant answer')

    void (async () => {
      try {
        const activeTab = await getActiveTab()
        const activeUrl = activeTab?.url || ''

        if (!activeTab?.id || !activeUrl.startsWith('https://chatgpt.com/')) {
          throw new Error('Not on ChatGPT (https://chatgpt.com/*)')
        }

        const extraction = await requestLatestAssistantExtraction(activeTab.id)
        const latestAssistantMessageText = extraction.text
        const structuredCandidates = sanitizeTaskCandidates(extraction.taskCandidates)
        const regexCandidates = parseChecklistTasks(latestAssistantMessageText)
        const rawTasks = structuredCandidates.length > 0 ? structuredCandidates : regexCandidates
        const tasks = dedupeTasksPreserveOrder(rawTasks)
        if (tasks.length === 0) {
          const previewCandidates = sanitizeTaskCandidates(
            latestAssistantMessageText.split('\n')
          ).slice(0, 3)
          const preview = previewCandidates.join(' | ')
          throw new Error(
            `No task lines found. structured=${structuredCandidates.length} regex=${regexCandidates.length} preview=${preview || '[empty]'}`
          )
        }

        const token = await getAuthTokenInteractive(scopes)
        const { spreadsheetId, spreadsheetUrl, firstSheetId } = await createChecklistSheet(token)
        await writeChecklistRows(token, spreadsheetId, tasks)
        await enableDoneColumnCheckboxes(token, spreadsheetId, firstSheetId, tasks.length)
        await chrome.tabs.create({ url: spreadsheetUrl })

        sendResponse({
          ok: true,
          url: spreadsheetUrl,
          taskCount: tasks.length,
          parsedTaskCount: rawTasks.length
        })
      } catch (error) {
        const errorMessage = stringifyErrorMessage(error)
        // eslint-disable-next-line no-console
        console.error('[sheets] Failed to export latest assistant answer', {
          errorMessage
        })
        sendResponse({
          ok: false,
          error: errorMessage
        })
      }
    })()

    return true
  }
})
