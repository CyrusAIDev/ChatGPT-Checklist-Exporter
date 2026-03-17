# Progress

**Sprint:** Premium Polish Sprint  
**Overall:** 67% `▓▓▓▓░░░░░░` (P0–P3 done)

**Current Phase:** Phase P4 — Archived and Reset Polish

**Current Focus:** archived section presentation, reset placement and destructive clarity, reset dialog polish

## Polish Phase Checklist

- [x] Phase P0 — Freeze and Visual Audit
- [x] Phase P1 — Panel Shell and Header
- [x] Phase P2 — Actions, Checklist Rows, and Progress Feel
- [x] Phase P3 — States and Messages
- [ ] Phase P4 — Archived and Reset Polish
- [ ] Phase P5 — Final Polish QA and Cleanup

## Completed

- P0: Freeze and visual audit; boundary documented below
- P1: Panel shell and header — CSS variables (spacing, typography, color); PanelHeader with title + supporting line; section rhythm; variables applied to states/archived/dialog
- P2: Actions and checklist rows — stronger primary button; destructive isolated (margin-left: auto); row spacing and checkbox/text alignment; checked state uses --text-muted; subtle “X of Y completed” progress summary
- P3: States and messages — unified state-card treatment for loading, unsupported, no_response, not_chatgpt, null, unsupported, generating, no assistant; short clear copy; refresh/retry recovery: no_response shows “Refresh page” (reloads active ChatGPT tab) + Retry, recommend refresh in copy; no new permissions

## In Progress

- none

## Next

- P4: archived and reset polish

## Blockers

- none

## P0 Audit: UI vs Logic Boundary

**Files safe for UI polish (presentation only):**
- `src/entrypoints/sidepanel/App.tsx` — structure, classNames, copy; do not change state shape, handlers, or data flow
- `src/styles/sidepanel.css` — all styles (variables, spacing, typography, buttons, states, archived, dialog)
- `src/components/ResetConfirmDialog.tsx` — markup and classNames only
- `src/entrypoints/sidepanel/main.tsx` — entry; leave as-is unless adding a global style import

**Files to leave alone (business logic / MVP behavior):**
- `src/lib/merge/*` — merge-checklist, fuzzy-match
- `src/lib/storage/*` — checklist-repo, storage-guards, storage-keys
- `src/lib/chatgpt/*` — parse-checklist, extract-latest-assistant-message, conversation, normalize-item
- `src/types/*` — checklist, messages
- `src/entrypoints/chatgpt.content.ts` — content script
- `src/entrypoints/background.ts` — messaging

**Where polish will happen (by phase):**
- **P1:** `.sidepanel`, `.sidepanel-header`, `h1`, top padding, section rhythm, optional CSS variables
- **P2:** `.header-actions`, `.btn-*`, `.checklist-list`, `.checklist-item`, `.item-checked`, optional progress summary
- **P3:** `.state-loading`, `.state-unsupported`, `.state-error`, `.state-info`, `.state-empty`, `.state-no-content`, merge summary, Retry button placement
- **P4:** `.archived-section`, `.archived-toggle`, `.archived-list`, `.reset-dialog-backdrop`, ResetConfirmDialog styles
- **P5:** Final pass, tests, build, dead-code cleanup if safe

## MVP Behavior To Protect

Do not break:
- conversation detection
- create checklist
- persistence
- merge latest
- wait-until-finished while ChatGPT is generating
- archived behavior
- no-op merge / already up to date
- reset confirmation
- unsupported / non-saved / no-list states

## Design Direction Locked

- one-column side panel
- calm, premium, focused UI
- inspired by Todoist clarity, Superlist polish, Any.do friendliness
- stronger visual hierarchy
- cleaner spacing
- better typography
- clearer button hierarchy
- calmer state cards
- cleaner archived section
- subtle progress feel only if it stays uncluttered

## Scope Rejected For This Sprint

- checklist library
- multiple checklists
- AI features
- backend
- billing
- integrations
- popup / options page
- task-manager expansion
- broad architecture rewrite

## Future Compatibility To Preserve

Do not block:
- checklist library across conversations
- use of saved checklists while browsing other sites
- one paid AI action for cleanup / organization / expansion

## Do Not Build

Do not add features outside the current polish phase. Do not broaden scope. Do not touch core logic unless fixing a real bug.