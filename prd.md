# PRD — Post-Library Execution Upgrade

## Product
A calm, local-first execution layer for ChatGPT conversations.

Current product shape:
- one living checklist per conversation
- deterministic merge
- checked state preserved across revisions
- removed items archived
- cross-conversation library available in the side panel
- usable on ChatGPT and while browsing elsewhere in Chrome

## Who this is for
Solo operator / builder / consultant who uses ChatGPT to generate plans, then wants to actually execute them without re-copying work into another app.

## Core promise
Turn ChatGPT plans into living checklists that stay useful across revisions and across conversations.

## Current stage
The premium polish sprint and checklist library are already done.

This next stage is:
1. preserve ordered step-by-step structure when the source is sequential
2. build one paid-worthy assistive AI action: AI Clean Up
3. prepare launch assets after that

## What premium means now
Premium does not mean more surface area.

Premium now means:
- the checklist respects the source format better
- step-by-step plans still feel like steps
- the library is useful anywhere in Chrome
- one assistive AI action saves meaningful time
- preview-before-apply builds trust
- nothing breaks the deterministic local-first core

## This stage’s goals

### Goal 1 — Ordered-step preservation
If ChatGPT gives a numbered sequence or true step-by-step output, the extension should preserve that structure visually.

It should still be a checklist.
It should not become a workflow engine.

### Goal 2 — AI Clean Up MVP
Add one narrow assistive AI action that makes a saved checklist cleaner and easier to execute.

The AI action should:
- tighten wording
- remove obvious duplicates
- standardize phrasing
- keep the checklist flat and practical
- show preview before apply

## Must not break
- conversation-based checklist identity
- capture from latest assistant output
- merge latest without losing matched checked state
- archive behavior
- reset behavior
- local-first storage
- library list/detail behavior
- check/uncheck persistence
- original chat deep link from library

## In scope now
- preserve ordered vs unordered source structure
- render ordered checklists as numbered steps
- keep merge matching based on normalized text, not visible numbers
- AI Clean Up MVP with preview/apply
- compact doc updates that keep Cursor aligned
- minimal UI needed for the AI action

## Out of scope now
Do not build:
- cloud sync
- team features
- tags / priorities / due dates
- subtasks
- folders/projects
- multiple AI actions
- AI workspace features
- backend-heavy systems
- billing
- popup/options detours
- broad refactors

## Ordered-step rule
When the source is step-by-step, preserve that presentation.

Good:
- numbered visual treatment
- same check/uncheck behavior
- same merge logic

Bad:
- turning every ordered sequence into a generic unordered list
- using step numbers as merge identity
- adding workflow complexity

## AI Clean Up rule
AI stays assistive, not central.

The first paid AI action should:
- operate on one saved checklist at a time
- work from current chat checklist and library detail
- produce a preview
- require user apply
- not silently overwrite the checklist

## Success bar
This stage is successful when:
- step-by-step outputs stay visibly ordered
- library remains stable
- AI Clean Up produces useful previewable edits
- apply preserves trust and checked-state behavior
- the product feels more worth paying for without turning into a bigger app