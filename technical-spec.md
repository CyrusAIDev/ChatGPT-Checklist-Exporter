
## FILE: technical-spec.md — [download](sandbox:/mnt/data/technical-spec.md)

```md
# Chosen Stack

WXT + React + TypeScript + plain CSS + Vitest

# Why This Stack

- WXT gives a clean modern extension build without custom build-system work.
- React is the simplest maintainable side panel UI for this product.
- TypeScript strict mode protects merge and storage logic.
- Plain CSS keeps dependencies low.
- Vitest is enough for the risky logic on day one.
- Playwright is useful later, but not required for the first shipping pass.

# Project Structure

```text
/
  public/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png

  src/
    entrypoints/
      background.ts
      chatgpt.content.ts
      sidepanel/
        index.html
        main.tsx
        App.tsx

    components/
      ChecklistList.tsx
      ChecklistItemRow.tsx
      EmptyState.tsx
      ErrorState.tsx
      HeaderActions.tsx
      ResetConfirmDialog.tsx

    lib/
      chatgpt/
        conversation.ts
        extract-latest-assistant-message.ts
        parse-checklist.ts
        normalize-item.ts
      merge/
        merge-checklist.ts
        fuzzy-match.ts
      storage/
        checklist-repo.ts
        storage-guards.ts
        storage-keys.ts
      chrome/
        messages.ts

    types/
      checklist.ts
      messages.ts

    styles/
      sidepanel.css

  tests/
    unit/
      normalize-item.test.ts
      parse-checklist.test.ts
      merge-checklist.test.ts
      storage-guards.test.ts

  wxt.config.ts
  tsconfig.json
  vitest.config.ts
  package.json
  Manifest and Permissions

Use this MVP manifest shape:
{
  "manifest_version": 3,
  "name": "Living Checklist for ChatGPT",
  "version": "0.1.0",
  "action": {
    "default_title": "Open Living Checklist"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": ["storage", "sidePanel", "tabs"],
  "host_permissions": ["https://chatgpt.com/*"],
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["chatgpt.content.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
Rules:

Do not add activeTab, scripting, or identity. (Exception: tabs is allowed when required for active-tab page-state messaging.)

Do not add any Google API host permissions.

Background should set openPanelOnActionClick.

Restrict storage access to trusted contexts only.

Core Extension Architecture

Side panel

main product UI

loads active conversation state

reads and writes checklist data

triggers create, merge, toggle, and reset

renders active and archived items

Content script

runs only on https://chatgpt.com/*

reads the ChatGPT DOM

returns conversation ID and latest assistant message data

does not own storage or merge logic

Background/service worker

minimal setup only

opens side panel on action click

sets storage access level

no product logic, no network, no polling

Shared utilities/types

pure functions for parsing, normalization, merge, and storage validation

shared message contracts between side panel and content script

Conversation Identification

Use the URL path only.

Rule:

accept only /c/:conversationId

derive conversationId from window.location.pathname

if there is no /c/:conversationId, treat the page as unsupported

Do not derive checklist identity from title, sidebar text, or DOM content.

Parsing Strategy

Use a two-step parser in the content script.

Step 1: DOM-first

find the latest assistant message container

read <li> elements in DOM order

extract visible text with textContent

detect markdown checkbox intent from leading [ ] or [x]

Step 2: text fallback

if no list items exist, read the latest assistant message text

split by line

keep only lines that look like bullets, numbered items, or markdown checkboxes

Parsing rules:

trim whitespace

remove list prefixes and checkbox markers from stored display text

ignore empty lines

ignore prose paragraphs

flatten nested lists into one ordered list for MVP

dedupe exact duplicate normalized items inside the same capture

Merge Strategy

Start with existing active items only.

Normalize existing and new items the same way:

lowercase

trim

remove list and checkbox prefixes

collapse internal whitespace

strip trailing punctuation

Match in this order:

exact normalized match

conservative fuzzy match

Conservative fuzzy match uses token overlap only.

Allow a fuzzy match only when:

the score is high

there is one clear best candidate

the result is unambiguous

If unclear, treat as a new item.

Matched item keeps old id and old checked value.

Matched item updates display text to the latest source text.

Unmatched new item becomes a new active item.

Unmatched old active item becomes archived.

Never auto-delete.

Never auto-uncheck a matched item.

Rebuild active order to match the latest source order.

Recommended fuzzy implementation:

tokenize normalized strings by spaces

score = 2 * sharedTokenCount / (oldTokenCount + newTokenCount)

require score >= 0.85

require best candidate to beat second-best by at least 0.10

otherwise treat as ambiguous

Storage Strategy

Use chrome.storage.local only.

Key format:

checklist:${conversationId}

Rules:

read on side panel load after conversation resolution

write full record on create, merge, toggle, and reset

store sourceFingerprint to prevent re-merging the same latest source twice

validate stored data before use

keep content script out of checklist storage access

do not use localStorage, storage.sync, IndexedDB, or remote persistence

State Management

Use a single useReducer in the side panel app.

Keep state limited to:

supported page status

conversation ID

checklist record

busy state

transient error text

last merge summary

Do not add Redux, Zustand, MobX, or extra state libraries.

Error Handling

User-facing states:

unsupported page

no checklist found

extraction failed

already up to date

still generating (disable create/merge, show wait message)

storage failed

corrupted stored data

Rules:

never overwrite valid saved data with an invalid parse result

if merge fails, keep existing checklist untouched

validate stored records on read

surface plain-English errors in the side panel

log internal errors in development only

Security and Privacy Rules

no network requests in MVP

no OAuth

no remote scripts or remote HTML

no analytics in MVP

no innerHTML, dangerouslySetInnerHTML, eval, or dynamic code execution

validate all messages between side panel and content script

request only minimal permissions

keep storage local only

publish honest privacy disclosures later if the product ships publicly

Code Quality Rules

TypeScript strict mode on

no any in parse, merge, storage, or message code

no dead code

no placeholder billing/auth/integration scaffolding

minimal dependencies

pure functions for normalize, parse, merge, and storage validation

one job per module

no premature abstraction

no broad refactors without updating progress.md

Minimum Testing Strategy

Day-one required:

unit tests for normalization

unit tests for parsing

unit tests for merge behavior

unit tests for storage validation

manual QA at phase boundaries

Manual QA focus:

create checklist from real ChatGPT list

toggle items and reload

merge revised plan

verify archived items

verify destructive reset

verify unsupported page handling

Optional later:

Playwright smoke tests for create, merge, reload, and reset

Deletion Plan for Legacy Scope

Delete completely:

Google OAuth

Google Sheets export

popup flow

options page

auth/cloud/export code

unnecessary permissions

Google-specific config and environment handling

generic starter-template clutter not required for side panel + content script + storage

demo settings, themes, i18n, and bridge abstractions not needed for MVP

Reuse only if directly helpful:

icon assets

tiny pieces of ChatGPT DOM extraction logic

basic build config only if it is already cleaner than a fresh WXT setup

Preferred approach:

start from a fresh WXT app

port only useful ChatGPT extraction ideas

do not refactor legacy junk into the new product

Build Sequence

Create fresh WXT React TypeScript project.

Configure minimal manifest and side panel.

Add minimal background worker.

Add ChatGPT content script for conversation ID and latest assistant extraction.

Add pure normalize and parse utilities with unit tests.

Add storage repo and schema guards.

Build side panel shell with unsupported and empty states.

Implement create checklist flow.

Implement toggle persistence.

Implement merge and archive logic.

Implement destructive reset confirmation.

Run unit tests and manual QA.

Package MVP.