# Progress

**Progress bar:** `[#####] 70%`
**Current phase:** P4 hotfix — Recovery flow
**Current focus:** Retry/refresh robust; no dead-end states.

## Completed
- working MVP exists
- core merge/storage/checklist model is locked
- execution docs are locked
- scope guardrails are locked
- P0 baseline lock
- P1 brand surface and visual tokens
- P2 checklist view and action hierarchy
- P3 states, archive, and reset
- P4 ChatGPT-first relevance and ship pass
- P4 hotfix: recovery flow (bounded retry, no-content recovery actions, tab-ready delay)

## In Progress
- premium brand / polish sprint
- P4 hotfix verification

## Next
- P5 final QA and stop (when recovery hotfix accepted)
- checklist library planning (after sprint)

## Blockers
- none

## Decisions locked
- ChatGPT-first, not broad productivity suite
- one living checklist per conversation
- local-first deterministic core stays
- merge/storage/conversation identity stay protected
- premium = clarity, hierarchy, calmness, readability, trust
- product name is provisional during this sprint
- first paid AI action is later, likely assistive, not central
- build order: polish sprint -> polished MVP ship -> library -> one paid AI action

## Scope rejected
- full task manager
- workspace expansion
- broad AI suite
- backend-heavy work
- cloud sync
- team features
- due dates / priorities / tags
- drag and drop
- popup/options work
- multiple premium features at once
- broad architecture refactors

## Resume rule for a new Cursor chat
1. Read `@prd.md`
2. Read `@technical-spec.md`
3. Read `@build-plan.md`
4. Read `@progress.md`
5. Read `@golden-qa.md` if present
6. Complete exactly one phase
7. Update this file
8. Create a git checkpoint
