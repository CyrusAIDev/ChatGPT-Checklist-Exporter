
## FILE: build-plan.md — [download](sandbox:/mnt/data/build-plan.md)

```md
# Build Plan

## Purpose

This file is the execution loop for Cursor. Finish one phase at a time. Do not jump ahead. At the end of each phase, update `progress.md` before starting the next phase.

## Operating Rules

- Work only on the current phase.
- Do not rewrite architecture unless blocked.
- Do not add features not named in `prd.md`.
- Do not preserve legacy scope just because it exists.
- Keep outputs small and concrete.
- Prefer code changes over long explanations.
- After each phase: run the listed checks, update `progress.md`, stop.

## Token Rules for Cursor Chats

- Read `prd.md`, `technical-spec.md`, `build-plan.md`, and `progress.md` only.
- Do not restate the full spec in chat.
- Report changes as: done, files changed, manual test result, next step, blockers.
- If blocked, describe the blocker in 3 lines max and update `progress.md`.
- Do not generate alternative architectures.
- Do not write big retrospectives.

## Phase 0 — Reset the Codebase

### Cursor should do
- inspect current repo
- delete legacy scope
- create fresh WXT React TypeScript baseline if current project is worse than rebuilding
- keep only assets or tiny DOM extraction code worth reusing

### Definition of done
- no Google OAuth
- no Google Sheets export
- no popup
- no options page
- no unnecessary permissions
- clean project tree matches `technical-spec.md`

### Manual test
- repo boots locally
- extension build command works
- manifest contains only expected permissions

### Update `progress.md`
- mark Phase 0 complete
- record what was deleted
- lock architecture and permissions

## Phase 1 — Minimal Extension Shell

### Cursor should do
- wire MV3 manifest
- add side panel entry
- add minimal background worker
- open side panel on action click
- restrict storage to trusted contexts
- add empty side panel UI shell

### Definition of done
- extension loads unpacked
- toolbar action opens side panel
- side panel renders placeholder states

### Manual test
- load unpacked extension
- click toolbar icon
- side panel opens and renders

### Update `progress.md`
- mark Phase 1 complete
- set current phase to Phase 2

## Phase 2 — ChatGPT Detection and Extraction

### Cursor should do
- add content script for `chatgpt.com`
- extract `conversationId` from `/c/:id`
- detect unsupported pages
- extract latest assistant message
- add message contract between side panel and content script

### Definition of done
- side panel knows whether page is supported
- side panel can fetch latest assistant message data
- unsupported page state works

### Manual test
- open saved ChatGPT conversation
- confirm conversation detected
- open non-conversation ChatGPT page
- confirm unsupported state

### Update `progress.md`
- mark extraction status
- note any selector fragility

## Phase 3 — Parse and Create Checklist

### Cursor should do
- implement normalization
- implement DOM-first parser
- implement text fallback parser
- dedupe exact duplicate source items
- create checklist record from latest assistant message
- add unit tests for normalization and parsing

### Definition of done
- user can click **Create checklist**
- checklist appears in side panel
- parser handles bullets, numbered items, and markdown checkboxes

### Manual test
- test bullet list
- test numbered list
- test markdown checkbox list
- test no-list failure state

### Update `progress.md`
- mark create flow complete
- record parser coverage done

## Phase 4 — Local State and Toggle Persistence

### Cursor should do
- add storage repo for `chrome.storage.local`
- add schema validation
- load checklist by conversation
- persist toggle changes immediately
- restore checklist on reload

### Definition of done
- checked state survives page reload and browser restart
- invalid stored data does not crash UI

### Manual test
- create checklist
- toggle several items
- reload tab and browser
- verify state persists

### Update `progress.md`
- mark persistence complete
- note any storage issues

## Phase 5 — Merge and Archive

### Cursor should do
- implement merge engine
- exact normalized match first
- conservative fuzzy match second
- ambiguous becomes new item
- unmatched old items become archived
- add unit tests for merge behavior
- show merge summary counts

### Definition of done
- merge preserves checked state on safe matches
- removed items move to archived
- same source does not re-merge unnecessarily

### Manual test
- merge minor wording change
- merge added item
- merge removed item
- merge ambiguous rewrite

### Update `progress.md`
- mark merge complete
- record any known merge limitations

## Phase 6 — Reset and Error States

### Cursor should do
- add destructive reset confirmation
- wipe checklist for current conversation only
- finish user-facing error states
- polish archived section default collapse

### Definition of done
- reset works only after confirmation
- all main failure states are readable
- UI is stable for MVP

### Manual test
- reset current conversation checklist
- verify checklist is gone
- verify other conversation data is untouched
- verify extraction and no-list errors

### Update `progress.md`
- mark reset and error handling complete
- set current phase to final QA

## Phase 7 — Final QA and Package

### Cursor should do
- run unit tests
- do final manifest audit
- clean dead code
- verify no banned scope exists
- create production build

### Definition of done
- MVP builds cleanly
- manifest is minimal
- no legacy scope remains
- `progress.md` shows all phases complete or clearly notes leftovers

### Manual test
- one full happy path from create to merge to reset
- one unsupported page test
- one no-list test

### Update `progress.md`
- mark project ready
- set percent complete
- list any non-blocking follow-ups

## Anti-Bloat Rules

- no popup
- no options page
- no export
- no auth
- no backend
- no analytics
- no manual task editing UI
- no extra permissions
- no extra state libraries
- no UI kit
- no generic refactor spree

## Resume Rules

When starting a new Cursor chat:
1. read `progress.md`
2. read the current phase in `build-plan.md`
3. read only the matching sections of `technical-spec.md`
4. complete the current phase only
5. update `progress.md`

## Useful Prompts

- Complete the current phase from `build-plan.md` and update `progress.md`.
- Finish Phase 3 only. Do not start Phase 4.
- Audit the repo against `prd.md`, `technical-spec.md`, and `progress.md`. Report only drift.
- Resume from the next incomplete phase.