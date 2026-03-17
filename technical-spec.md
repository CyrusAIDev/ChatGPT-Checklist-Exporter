# Chosen Stack

Keep the current stack:

- WXT
- React
- TypeScript
- plain CSS
- Vitest

# Why This Stack

The current stack is already correct for the product and already implemented. This sprint is about premium polish, not stack changes.

The best path is:
- keep business logic stable
- improve the presentation layer
- make only small UI-facing code cleanup changes when clearly useful

# Sprint Goal

Refine the side panel UI so it feels premium, calm, readable, and intentional without changing the core MVP behavior.

# Non-Goals for This Sprint

Do not build:
- checklist library
- AI actions
- backend
- billing
- integrations
- popup
- options page
- manual task editing
- drag and drop
- due dates / priorities / tags
- task-manager expansion
- broad merge/storage refactors

# What Can Change

Allowed:
- side panel layout improvements
- typography and spacing improvements
- action hierarchy improvements
- state card improvements
- empty/error/info/wait state presentation improvements
- archived section presentation improvements
- subtle progress indicator
- small presentational component extraction
- CSS variable cleanup
- small App.tsx cleanup if it reduces UI risk

Not allowed:
- changing core storage behavior
- changing core merge behavior
- changing checklist identity model
- changing permissions
- adding backend assumptions into current MVP flow

# UI Architecture Rules

Business logic stays stable.

Presentation can be cleaned up.

Preferred direction:
- keep `App.tsx` as orchestrator
- extract tiny presentational components only if they reduce UI complexity
- do not create a giant component tree
- do not move business logic into style components
- keep state derivation simple and local

Recommended presentational pieces if useful:
- `PanelHeader`
- `StateCard`
- `ActionBar`
- `ChecklistSection`
- `ProgressSummary`
- `ArchivedSection`

These are optional. Only extract them if they make the UI easier to maintain.

# Design System Rules

Use a very small styling system.

Introduce or clean up:
- CSS variables for spacing
- CSS variables for colors
- CSS variables for radius
- CSS variables for typography scale
- CSS variables for border/surface tones
- consistent button classes
- consistent state-card classes

Keep it small and local.

Do not add:
- Tailwind
- UI kits
- CSS frameworks
- animation libraries

# Visual Rules

## Layout
- one-column panel
- strong top section
- clear vertical rhythm
- consistent section spacing
- avoid cramped stacking

## Header
Should communicate:
- product title or checklist context
- short supporting line
- optional subtle progress summary

Must feel anchored and premium.

## Action Hierarchy
- primary action: strongest visual weight
- secondary actions: lighter
- destructive action: isolated and clearly dangerous

## Checklist Rows
- more breathing room
- checkbox alignment cleaned up
- text should wrap well
- checked state should be de-emphasized but still readable
- long items should remain scannable

## State Presentation
Create a consistent pattern for:
- loading
- unsupported
- not saved conversation
- no response / retry
- extraction failure
- waiting for ChatGPT to finish
- no assistant content
- no parseable checklist
- already up to date

Each should feel intentional and visually consistent.

## Archived Section
- secondary surface
- collapsed by default
- clearer section label
- visually distinct from active checklist
- should feel “removed from latest plan,” not “trash”

## Progress Feel
Allowed only if subtle.

Recommended:
- completed count text such as `3 of 9 completed`
- optional thin progress bar
- no dashboard widgets
- no analytics feeling

# Accessibility and Usability Rules

- preserve clear contrast
- preserve readable font sizes
- preserve obvious button states
- preserve keyboard focus visibility
- use plain language in messages
- do not rely on color alone to signal meaning
- keep states low-cognitive-load

# Code Quality Rules

- do not touch merge/storage logic unless required by a real bug
- keep TypeScript strict
- no dead code
- no speculative abstractions for future AI/library work
- no new dependency unless clearly justified
- no broad refactors
- no duplicate style patterns if a small shared pattern can solve it
- avoid giant CSS sprawl; group styles by shell / states / checklist / dialog / buttons

# Future Compatibility Rules

This sprint must leave clean seams for:

## Checklist library later
The side panel should be polishable now without assuming only one future view forever.
A future library view should be able to coexist with the current checklist view.

## Paid AI action later
The action area should eventually be able to host one optional premium action without redesigning the whole panel.

Do not build either now. Just avoid painting the UI into a corner.

# Testing Strategy

## Required
- run existing unit tests
- run production build
- manually test:
  - create
  - persist
  - merge
  - no-op merge
  - waiting while ChatGPT generates
  - reset
  - unsupported/non-saved states
  - retry/no-response recovery if applicable

## Visual QA
Check:
- spacing consistency
- primary action prominence
- reset isolation
- archived readability
- state clarity
- progress subtlety
- no obvious visual clutter

# Build Sequence

## Phase P0 — Freeze and audit current MVP shell
- verify current working behavior before polish
- identify UI-only files to change
- confirm business logic is untouched

## Phase P1 — Panel shell and header polish
- improve outer layout
- improve header
- improve section rhythm
- improve general spacing and typography

## Phase P2 — Actions and checklist readability
- improve action hierarchy
- improve checklist row spacing and readability
- improve checked-state styling
- add subtle progress summary if clean

## Phase P3 — State polish
- unify empty/error/info/wait state presentation
- improve retry/no-response presentation
- improve already-up-to-date presentation

## Phase P4 — Archived and reset polish
- improve archived section treatment
- ensure reset remains clearly destructive and separate

## Phase P5 — QA and cleanup
- run tests/build
- remove dead UI leftovers if safe
- final visual QA
- update progress.md
- commit checkpoint

# Definition of Done

The panel should feel noticeably more premium without adding features, without changing the core product promise, and without reducing reliability.