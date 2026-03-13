# Progress

**Overall:** 100% `██████████`

**Current Phase:** Complete

**Current Focus:** —

## Phase Checklist

- [x] Phase 0 — Reset the Codebase
- [x] Phase 1 — Minimal Extension Shell
- [x] Phase 2 — ChatGPT Detection and Extraction
- [x] Phase 3 — Parse and Create Checklist
- [x] Phase 4 — Local State and Toggle Persistence
- [x] Phase 5 — Merge and Archive
- [x] Phase 6 — Reset and Error States
- [x] Phase 7 — Final QA and Package

## Completed

- **Phase 0:** Legacy scope removed. Fresh WXT + React + TypeScript baseline. Manifest: storage, sidePanel, host_permissions chatgpt.com only. No popup, options, OAuth, or Sheets.
- **Phase 1:** MV3 manifest wired. Side panel entry, minimal background, open panel on action click, storage restricted to trusted contexts. Placeholder side panel UI.
- **Phase 2:** Content script extracts conversationId from /c/:id, latest assistant message from DOM. Message contract: side panel → background `GET_PAGE_STATE_FOR_ACTIVE_TAB`; background → content script `GET_PAGE_STATE`; content script responds on demand. No background cache. (Bug fix: `tabs` permission added for active-tab resolution.)
- **Phase 3:** Normalization (normalize-item.ts), DOM-first + text fallback parser (parse-checklist.ts), dedupe by normalized text. createChecklistRecord, parseLatestMessage. checklist-repo get/set. Side panel: Create checklist button, checklist list display, no-list error state. Unit tests: normalize-item.test.ts, parse-checklist.test.ts (17 tests).
- **Phase 4:** storage-guards.ts validates stored records; getChecklist uses it (invalid data returns null). Toggle: checkbox per item, handleToggle updates record and setChecklist immediately. Checklist loads on panel open; state survives reload. Unit test: storage-guards.test.ts.
- **Phase 5:** Merge engine in lib/merge/ (fuzzy-match.ts token overlap, merge-checklist.ts). Exact match first, conservative fuzzy (≥0.85, margin 0.10); ambiguous = new item; unmatched old active → archived; sourceFingerprint no-op; Merge latest button + summary (matched, added, archived); archived section collapsed by default. Unit tests: fuzzy-match.test.ts, merge-checklist.test.ts.
- **Phase 6:** Destructive reset with confirmation (ResetConfirmDialog, deleteChecklist in checklist-repo). Wipes only current conversation checklist. Main states clarified: unsupported page (not chatgpt / not saved conversation), no tab, extraction failure (no_response), supported but no assistant content yet, no parseable checklist (error on create/merge), already up to date (info, not error). Side panel polish: spacing, typography, primary/destructive button hierarchy, archived visually secondary and collapsed by default. One-column layout; no new scope.
- **Phase 7:** Reliability fixes (retry on no_response, Retry button; isGenerating detection). Final QA, manifest audit, production build. No new permissions. MVP complete.

## Bug fix — Side panel sometimes needs reload to detect conversation (Phase 7)

- **Root cause:** Single request to content script can return no_response when the content script is not yet ready (e.g. after extension reload or tab just loaded). No retry or user recovery path.
- **Fix:** fetchPageStateWithRetry() retries up to 3 times with 400ms delay on no_response. Initial load and Create/Merge use it. no_response UI now shows a Retry button that re-runs the fetch. Message clarified: “The tab may still be loading or the extension was just reloaded.”

## Bug fix — Merge latest can merge partial output while ChatGPT is still generating (Phase 7)

- **Root cause:** Create/Merge used whatever was in the latest assistant message at click time; if ChatGPT was still streaming, partial content was merged.
- **Fix:** PageStatePayload extended with isGenerating. Content script detects streaming conservatively: class containing “streaming” on/inside last assistant message, or presence of “Stop generating” button (data-testid, aria-label, or button text). When isGenerating is true: dedicated panel state “Wait until ChatGPT finishes responding before creating or merging”; Create and Merge handlers also check fresh payload and refuse to proceed, showing the same message. No overwrite of checklist when generation in progress.

## In Progress

- none

## Next

- Optional: manual QA on real ChatGPT; follow-ups in non-blocking list if any.

## Phase 3 — Parser Coverage

- Bullets (-, *, •), numbered (1., 1)), markdown checkboxes ([ ], [x]). Line-based + DOM candidates. Dedupe by normalized text.

## Phase 5 — Merge Notes

- Fuzzy: token overlap score ≥ 0.85, best beats second by ≥ 0.10. No semantic/AI matching.

## Phase 2 — Extraction Notes

- Selectors: `[data-message-author-role="assistant"]`, `.markdown`. ChatGPT DOM may change; watch for fragility.

## Bug fix — Stale page state on Merge/Create (pre-Phase 7)

- **Root cause:** Create and Merge used `pageState` set only once when the panel opened. After ChatGPT produced a revised plan, the panel still had the old latest-message data, so merge compared against stale content and often returned “Already up to date.”
- **Fix:** Added `fetchFreshPageState()` (same `GET_PAGE_STATE_FOR_ACTIVE_TAB` message). Create and Merge now request fresh page state from the active tab immediately before parsing/merging. On success, panel state is updated with the fresh payload. On failure (no_response, no_tab, not_chatgpt), error is shown and no checklist data is overwritten.

## Bug fix — Page-state loading (Phases 2–4)

- **Root cause:** Side panel asked background for cached state (`lastContentTabId`); content script only sent state once at startup, so the panel often got null or stale state on real conversation URLs.
- **Fix:** Side panel now requests `GET_PAGE_STATE_FOR_ACTIVE_TAB`. Background resolves active tab via `chrome.tabs.query`, confirms chatgpt.com, sends `GET_PAGE_STATE` to that tab’s content script; content script responds on demand with fresh extraction. No background cache.
- **Permission:** `tabs` added so background can query the active tab and call `chrome.tabs.sendMessage(tabId, ...)` to the content script. Required for this flow; no way to “message the active tab’s content script” without it.
- **UI states:** Unsupported (not chatgpt / not /c/...), no tab or no response, supported but no assistant content yet, supported with content (create checklist or show list). Extraction failure (no_response) is not shown as unsupported.

## Blockers

- none

## Phase 0 — What Was Deleted

- **src:** manifest.ts, background/index.ts, content/index.ts, popup/*, options/*, components/*, logic/*, plugins/*, locales/*, styles/* (legacy), assets/icon.svg, globab.d.ts
- **scripts:** prepare-dev.ts, prepare-prod.ts, manifest-dev.ts, manifest-prod.ts, mvsw-dev.ts, mvsw-prod.ts, utils.ts
- **Root:** vite.config.ts, windi.config.ts, .eslintrc, .eslintrc.cjs, .eslintignore, .prettierrc, shim.d.ts
- **Dependencies removed:** Vue, vue-i18n, webext-bridge, windicss, tsup, esno, and all related build/lint deps

## Architecture Locked (Phase 0)

- WXT + React + TypeScript + plain CSS + Vitest
- src/entrypoints: background.ts, chatgpt.content.ts, sidepanel/ (index.html, main.tsx, App.tsx)
- src/types/checklist.ts, src/styles/sidepanel.css
- Build: `pnpm run build` → .output/chrome-mv3/
- Dev: `pnpm run dev`
- Permissions: storage, sidePanel, tabs. Host: https://chatgpt.com/* only.

## Decisions Locked

- Chrome only
- `chatgpt.com` only
- side panel only
- local-first
- `chrome.storage.local`
- permissions: `storage`, `sidePanel`, `tabs` (tabs required for active-tab page-state messaging)
- host permissions: `https://chatgpt.com/*`
- no network requests in MVP
- no popup
- no options page
- no manual task editing UI

## Scope Rejected

- Google OAuth
- Google Sheets export
- backend
- integrations
- cloud sync
- task manager features
- multi-site support
- team features
- payments in MVP

## Do Not Build

Do not add features outside the current phase. Do not broaden scope. Do not preserve legacy junk.
