# Build Plan

## Purpose

This file is the execution system for the premium polish sprint.

Cursor should use this file to improve the current MVP without breaking core functionality and without drifting into feature work.

## Operating Rules

- work only on the current polish phase
- preserve current MVP behavior
- do not broaden product scope
- do not add AI, checklist library, backend, billing, or integrations
- do not rewrite core business logic unless fixing a real bug
- prefer visual polish and small UI cleanup over architecture work
- update `progress.md` after each phase
- create a git checkpoint after each completed phase

## Required References

Cursor should always read:

- `@prd.md`
- `@technical-spec.md`
- `@build-plan.md`
- `@progress.md`

## Response Rules for Cursor

After each phase, report only:
1. phase completed
2. files changed
3. tests run
4. manual QA I should do now
5. blockers
6. whether `progress.md` was updated
7. git checkpoint hash

Keep responses compact.

## Phase P0 — Freeze and Visual Audit

### What Cursor should do
- inspect current UI files
- confirm current MVP behavior is already implemented
- identify where polish should happen
- identify UI-only files that should change
- identify business-logic files that should be left alone
- write a short plan for the polish phases in `progress.md`

### Definition of done
- clear boundary between UI polish and protected MVP logic
- no feature work started yet

### Manual test
- none required

### Update `progress.md`
- mark P0 complete
- set current phase to P1

### Git checkpoint
- commit after update

---

## Phase P1 — Panel Shell and Header

### What Cursor should do
- improve overall panel shell
- improve header hierarchy
- improve top spacing and section rhythm
- improve panel title / supporting text presentation
- introduce or clean up CSS variables if useful
- keep layout one-column

### Definition of done
- the panel feels more anchored and premium
- top area is clearer and more intentional
- spacing is more consistent

### Manual test
- open supported conversation
- open unsupported page
- compare header and top shell clarity in both states

### Update `progress.md`
- mark P1 complete
- note visible shell/header improvements
- set current phase to P2

### Git checkpoint
- commit after update

---

## Phase P2 — Actions, Checklist Rows, and Progress Feel

### What Cursor should do
- improve primary vs secondary vs destructive action hierarchy
- improve checklist row spacing
- improve checkbox/text alignment
- improve checked-state styling
- add a subtle progress summary if it stays clean
- keep rows readable for long text

### Definition of done
- primary action is obvious
- checklist feels easier to scan
- completed state is clear but still readable
- progress feel is subtle and useful

### Manual test
- create checklist
- check/uncheck items
- confirm rows feel readable
- confirm progress feel is helpful, not cluttered

### Update `progress.md`
- mark P2 complete
- set current phase to P3

### Git checkpoint
- commit after update

---

## Phase P3 — States and Messages

### What Cursor should do
- unify the visual treatment of:
  - loading
  - unsupported
  - not-saved conversation
  - no response / retry
  - extraction failure
  - waiting for ChatGPT
  - no assistant content
  - no parseable checklist
  - already up to date
- keep message language short and clear
- add Retry control only where useful
- ensure state surfaces feel calm and intentional

### Definition of done
- all major states feel visually consistent
- states are easy to distinguish
- the panel feels more trustworthy during edge cases

### Manual test
- unsupported page
- non-saved conversation
- no-list case
- already-up-to-date case
- generating/wait case

### Update `progress.md`
- mark P3 complete
- set current phase to P4

### Git checkpoint
- commit after update

---

## Phase P4 — Archived and Reset Polish

### What Cursor should do
- improve archived section presentation
- keep archived collapsed by default
- make archived feel secondary but intentional
- improve reset placement and destructive clarity
- make the reset dialog feel more polished without adding complexity

### Definition of done
- archived feels cleaner and easier to understand
- reset remains safe and clearly destructive
- destructive actions do not visually compete with the primary action

### Manual test
- merge so something becomes archived
- inspect archived section
- test reset cancel
- test reset confirm

### Update `progress.md`
- mark P4 complete
- set current phase to P5

### Git checkpoint
- commit after update

---

## Phase P5 — Final Polish QA and Cleanup

### What Cursor should do
- run tests
- run build
- do final visual cleanup
- remove tiny dead UI leftovers if clearly safe
- confirm no scope creep was introduced
- confirm current MVP behavior still works
- update `progress.md`
- create final checkpoint commit

### Definition of done
- MVP still works
- UI feels noticeably more premium
- no new product scope added
- build passes
- tests pass
- progress tracker is complete

### Manual test
Run one full pass:
1. create checklist
2. persist checklist
3. merge revised plan
4. verify wait-until-finished state
5. verify archived
6. verify already up to date
7. verify reset
8. verify unsupported / non-saved / no-list states

### Update `progress.md`
- mark P5 complete
- mark overall sprint complete
- list non-blocking follow-ups only if needed

### Git checkpoint
- commit after update

---

## Anti-Bloat Rules

Do not add:
- AI features
- checklist library
- multiple checklists
- backend
- billing
- integrations
- task-manager features
- settings screens
- new permissions
- UI frameworks
- large animation systems

## Resume Rules

When starting a new Cursor chat:
1. read `@progress.md`
2. identify the current incomplete polish phase
3. read only the relevant sections of `@technical-spec.md`
4. complete only that phase
5. update `progress.md`
6. commit a checkpoint

## Useful Cursor Prompts

- Complete the current polish phase from `@build-plan.md` and update `@progress.md`.
- Finish Phase P2 only. Do not start P3.
- Audit the repo against `@prd.md`, `@technical-spec.md`, and `@progress.md`. Report only drift.
- Resume from the next incomplete polish phase.