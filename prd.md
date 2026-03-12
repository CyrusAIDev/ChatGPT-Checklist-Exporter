# Product Summary

Living Checklist for ChatGPT with Merge is a Chrome extension for `chatgpt.com` that turns the latest structured assistant output into one canonical checklist per conversation, preserves checked state locally, and merges later revised versions without wiping progress.

# Target User

A solo ChatGPT-heavy operator who uses one conversation to create and revise a plan, then needs a stable checklist to execute against.

# Core Problem

ChatGPT rewrites plans as the conversation evolves. Users either work from scrollback and lose state, or copy the plan somewhere else and break the link to the conversation. Each revision forces manual comparison and re-checking.

# Product Promise

One conversation gets one living checklist. Progress survives reloads. Revisions merge without resetting completed work.

# MVP Scope

- Chrome extension only
- `chatgpt.com` only
- one side panel UI
- one canonical checklist per conversation
- create checklist from the latest assistant message only
- parse bullets, numbered items, and markdown checkboxes only
- check and uncheck items
- merge a later revision into the same checklist
- archive removed items instead of deleting them
- destructive reset for the current conversation only
- local-first with `chrome.storage.local`

# User Flow

1. User opens a saved ChatGPT conversation.
2. User opens the extension side panel.
3. User clicks **Create checklist**.
4. The extension parses the latest assistant message and stores one checklist for that conversation.
5. User checks items while working.
6. ChatGPT later outputs a revised plan in the same conversation.
7. User clicks **Merge latest**.
8. The extension preserves matched checked items, adds new items, archives removed items, and updates order to match the latest plan.
9. If needed, user clicks **Reset checklist**, confirms, and wipes the checklist for that conversation.

# Functional Requirements

- Derive one stable checklist record per ChatGPT conversation.
- Refuse checklist creation when the page is not a saved conversation.
- Read only the latest assistant message in MVP.
- Parse DOM list items first; fall back to line-based parsing.
- Support `-`, `*`, `•`, `1.`, `1)`, `[ ]`, and `[x]`.
- On first capture, initialize checked state from source markdown checkboxes if present; otherwise unchecked.
- Persist checkbox toggles immediately to local storage.
- Merge only when the user explicitly clicks **Merge latest**.
- After merge, active item order follows the latest source order.
- Removed items move to **Archived**.
- Archived items are collapsed by default.
- Reset requires confirmation and clearly states that it deletes the checklist for the current conversation.
- Show clear states for unsupported page, no checklist found, extraction failure, and already up to date.

# Non-Goals

- no Google OAuth
- no Google Sheets export
- no popup workflow
- no options page
- no cloud sync
- no backend
- no remote APIs
- no integrations
- no manual add/edit/reorder/delete UI
- no due dates, priorities, reminders, recurring tasks, calendars, Kanban, or notifications
- no multiple checklists per conversation
- no multi-site support
- no workspace or project management features
- no payments in MVP

# UX Requirements

- Side panel is the only user-facing surface.
- Extension action opens the side panel directly.
- Empty state has one primary action: **Create checklist**.
- When a checklist exists, the primary actions are **Merge latest** and **Reset checklist**.
- Checklist UI must be plain, fast, and quiet.
- Item text wraps cleanly.
- Archived items are collapsed by default.
- Reset is visually dangerous and clearly destructive.
- No onboarding tour, settings surface, debug UI, or wizard.

# Technical Constraints

- Chrome Manifest V3 only.
- Permissions limited to `storage` and `sidePanel`.
- Host permissions limited to `https://chatgpt.com/*`.
- One content script for ChatGPT DOM extraction.
- One minimal background/service worker.
- One side panel app.
- Local-first with `chrome.storage.local`.
- No network requests in MVP.
- No OAuth, backend, export, popup, or options page.

# Merge Behavior

- exact normalized match first
- conservative fuzzy match for minor wording changes
- if ambiguous, treat as a new item
- never auto-uncheck a matched item
- unmatched old items become archived

# Storage Model

Store one record per conversation under:

`checklist:{conversationId}`

```ts
export type ChecklistRecord = {
  version: 1
  conversationId: string
  sourceFingerprint: string | null
  updatedAt: number
  items: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
  archived: boolean
  order: number
}
```

# Rules

sourceFingerprint prevents re-merging the same source twice.

items contains both active and archived items.

Active items sort by order.

# Edge Cases

User is on chatgpt.com but not inside a saved conversation URL.

Latest assistant message contains no parseable checklist.

Same item appears twice in one source capture.

A revision rewrites items so heavily that matching is ambiguous.

ChatGPT DOM changes and extraction fails.

User merges the same latest assistant message twice.

Stored data is corrupted or missing required fields.

# Acceptance Criteria

The extension works only on saved chatgpt.com conversations.

Create checklist builds one checklist from the latest assistant message.

Checked state survives reloads, browser restart, and returning to the same conversation.

Merge latest preserves checked state for exact matches and conservative fuzzy matches.

Ambiguous changes create new items instead of risky matches.

Removed items move to Archived.

Reset checklist requires confirmation and deletes only the current conversation checklist.

No login prompt, OAuth flow, backend call, or third-party API call exists anywhere in MVP.

Requested permissions stay minimal.

# Final Constraint Reminder

This product is one living checklist per ChatGPT conversation with manual merge of later revisions. Chrome only. chatgpt.com only. Side panel only. Local-first. No OAuth. No export in MVP. No integrations. No team features. No manual task editing. No task-manager sprawl.