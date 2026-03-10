<template>
  <main class="w-[300px] px-4 py-5 text-center text-gray-700 dark:text-gray-200">
    <img src="/assets/icon.svg" class="icon-btn mx-2 text-2xl" />
    <div>Popup</div>
    <p class="mt-2 opacity-50">
      {{ $t('popup.desc') }}
    </p>
    <button class="btn mt-2" @click="openOptionsPage">
      {{ $t('popup.open_options') }}
    </button>
    <button class="btn mt-2" @click="testGoogleLogin">
      Test Google Login
    </button>
    <button class="btn mt-2" @click="createEmptyChecklistSheet">
      Create Empty Checklist Sheet
    </button>
    <button class="btn mt-2" @click="exportLastAnswerToSheet">
      Export Last Answer to Sheet
    </button>

    <p class="mt-2 text-xs opacity-80">
      {{ authResult }}
    </p>

    <div class="mt-3 rounded border border-gray-300 p-2 text-left text-xs dark:border-gray-600">
      <div><strong>Debug</strong></div>
      <div class="mt-1">
        <span class="opacity-60">Extension ID:</span> {{ debugExtensionId }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">OAuth Client ID:</span> {{ debugClientId }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">Scopes:</span> {{ debugScopes }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">Last auth error:</span> {{ authErrorMessage }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">Version:</span> {{ debugVersion }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">Runtime version:</span> {{ debugRuntimeVersion }}
      </div>
      <div class="mt-1 break-all">
        <span class="opacity-60">Worker started:</span> {{ debugWorkerStartedAt }}
      </div>
    </div>

    <Footer />

    <div class="mt-2">
      <span class="opacity-50">{{ $t('popup.storage') }}:</span> {{ storageDemo }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storageDemo } from '~/logic/storage'

const authResult = ref('Not tested yet.')
const authErrorMessage = ref('None')
const debugExtensionId = ref('Unknown')
const debugClientId = ref('Unknown')
const debugScopes = ref('[]')
const debugVersion = ref('Unknown')
const debugRuntimeVersion = ref('Unknown')
const debugWorkerStartedAt = ref('Unknown')

type AuthTestResponse = {
  ok: boolean
  tokenLength?: number
  error?: string
  extensionId?: string
  clientId?: string
  scopes?: string[]
}

type CreateChecklistSheetResponse = {
  ok: boolean
  url?: string
  taskCount?: number
  error?: string
}

type DebugStatusResponse = {
  ok: boolean
  version?: string
  runtimeVersion?: string
  workerStartedAt?: string
}

onMounted(() => {
  const manifest = chrome.runtime.getManifest()
  debugExtensionId.value = chrome.runtime.id
  debugClientId.value = manifest.oauth2?.client_id || 'Missing oauth2.client_id'
  debugScopes.value = JSON.stringify(manifest.oauth2?.scopes || [])
  debugVersion.value = manifest.version || 'Unknown'
  loadDebugStatus()
})

function openOptionsPage() {
  chrome.runtime.openOptionsPage()
}

function loadDebugStatus() {
  chrome.runtime.sendMessage({ type: 'DEBUG_STATUS' }, (response?: DebugStatusResponse) => {
    if (chrome.runtime.lastError || !response?.ok) return
    if (response.version) debugVersion.value = response.version
    if (response.runtimeVersion) debugRuntimeVersion.value = response.runtimeVersion
    if (response.workerStartedAt) debugWorkerStartedAt.value = response.workerStartedAt
  })
}

function testGoogleLogin() {
  authErrorMessage.value = 'None'
  authResult.value = 'Requesting Google auth token...'

  chrome.runtime.sendMessage(
    { type: 'AUTH_TEST' },
    (response?: AuthTestResponse) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        authErrorMessage.value = runtimeError.message
        authResult.value = `Error: ${runtimeError.message}`
        return
      }

      if (!response) {
        authErrorMessage.value = 'No response from background'
        authResult.value = 'Error: No response from background'
        return
      }

      if (response.extensionId) debugExtensionId.value = response.extensionId
      if (response.clientId) debugClientId.value = response.clientId
      if (response.scopes) debugScopes.value = JSON.stringify(response.scopes)

      if (response.ok) {
        authResult.value = `Success: token length ${response.tokenLength}`
        return
      }

      const plainError =
        typeof response.error === 'string' && response.error.length > 0
          ? response.error
          : 'Unknown auth error'
      authErrorMessage.value = plainError
      authResult.value = `Error: ${plainError}`
    }
  )
}

function createEmptyChecklistSheet() {
  authErrorMessage.value = 'None'
  authResult.value = 'Creating Google Sheet...'

  chrome.runtime.sendMessage(
    { type: 'CREATE_EMPTY_CHECKLIST_SHEET' },
    (response?: CreateChecklistSheetResponse) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        authErrorMessage.value = runtimeError.message
        authResult.value = `Error: ${runtimeError.message}`
        return
      }

      if (!response) {
        authErrorMessage.value = 'No response from background'
        authResult.value = 'Error: No response from background'
        return
      }

      if (response.ok && response.url) {
        authResult.value = 'Success: Checklist sheet created and opened.'
        return
      }

      const plainError =
        typeof response.error === 'string' && response.error.length > 0
          ? response.error
          : 'Unknown sheet creation error'
      authErrorMessage.value = plainError
      authResult.value = `Error: ${plainError}`
    }
  )
}

function exportLastAnswerToSheet() {
  authErrorMessage.value = 'None'
  authResult.value = 'Exporting latest ChatGPT answer to Google Sheet...'

  chrome.runtime.sendMessage(
    { type: 'EXPORT_LAST_ANSWER_TO_SHEET' },
    (response?: CreateChecklistSheetResponse) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        authErrorMessage.value = runtimeError.message
        authResult.value = `Error: ${runtimeError.message}`
        return
      }

      if (!response) {
        authErrorMessage.value = 'No response from background'
        authResult.value = 'Error: No response from background'
        return
      }

      if (response.ok && response.url) {
        authResult.value = `Success: Exported ${response.taskCount || 0} tasks to sheet.`
        return
      }

      const plainError =
        typeof response.error === 'string' && response.error.length > 0
          ? response.error
          : 'Unknown export error'
      authErrorMessage.value = plainError
      authResult.value = `Error: ${plainError}`
    }
  )
}
</script>
