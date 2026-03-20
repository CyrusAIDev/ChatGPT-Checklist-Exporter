# Progress

**Progress bar:** `[######] 100%`
**Current phase:** Sprint complete
**Current focus:** First paid AI action (next milestone).

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
- P5 final QA and stop (recovery UX: Retry → Check again secondary; build + tests pass)
- micro ship-polish: reset dialog warning as non-interactive note (left-accent strip, no button affordance)
- merge hardening: reorder-only triggers merge (order-preserving fingerprint); archived items can re-match and unarchive with identity/checked preserved
- merge/source stabilization: no-op when merged result equivalent to existing (avoids meaningless merge summary); order-preserving fingerprint in create; multi-response handling (use selected/visible only, show “Choose a response version” when ambiguous)
- source-selection hotfix: use latest assistant reply only; ambiguity only when latest turn has multiple visible/selected candidates
- source-selection debugging/fix: pure `chooseAssistantSource` helper + dev-only extractor logging; default last contentful assistant; ambiguity only with positive same-article grouping and no single selected winner (multiple visible turns no longer ambiguous)
- **Checklist library milestone:** cross-conversation Library in side panel (list + search, detail with check/uncheck + archive, open original chat in new tab), minimal record metadata (`createdAt`, `sourceChatUrl`, `conversationLabel` from page title), default Library when tab is not ChatGPT / no tab; Current chat flow unchanged for capture/merge/reset

## In Progress
- none

## Next
- first paid AI action (e.g. assistive clean-up; build only when milestone explicitly scopes it)

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
