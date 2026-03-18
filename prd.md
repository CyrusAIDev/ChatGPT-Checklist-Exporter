# PRD — Premium Polish Sprint

## Product
A calm premium execution layer for ChatGPT conversations.

Working model:
- one living checklist per conversation
- local-first
- deterministic merge
- checked state preserved across revisions
- removed items archived
- reset supported

## Who this is for
Solo operator / builder / consultant who uses ChatGPT to create and revise plans, but does not want to manually re-copy tasks into another tool.

## Core promise
Turn the latest structured ChatGPT output into a living checklist that survives revisions.

## What premium means here
Premium does **not** mean more features.

Premium means:
- clear hierarchy
- calm spacing
- readable rows
- obvious primary action
- polished empty/error/info states
- trustworthy local behavior
- coherent icon/copy/color system
- no “AI-generated extension shell” feeling

## Naming direction
Provisional only.
- Use a short ownable product name
- Keep “for ChatGPT” as descriptor, not primary brand
- Do not lock final name in code or copy during this sprint

## Current source of truth
The current repo is implementation truth.
Protect the working MVP. Improve the shell around it.

## Sprint goal
Make the current MVP feel paid-worthy and ship-worthy without changing the core product model.

At the end of this sprint, the product should feel:
- calmer
- more intentional
- easier to scan
- more trustworthy
- more brand-coherent
- ready for screenshots and early paid validation

## What must not break
- conversation-based checklist identity
- create checklist from latest assistant output
- merge latest without losing matched checked state
- archiving of removed items
- reset flow
- local-first storage
- deterministic behavior
- ChatGPT-first side panel flow

## In scope now
- premium visual system
- cleaner header and panel shell
- button hierarchy
- checklist row polish
- archived section polish
- empty/error/info/loading state polish
- copy cleanup
- light UI component extraction
- minimal behavior tweaks that improve product relevance or shipping confidence

## Out of scope now
Do not build:
- task manager features
- workspace features
- team features
- cloud sync
- backend-heavy systems
- billing
- multiple premium AI actions
- library UI
- popup/options scope
- drag and drop
- due dates / priorities / tags
- random refactors
- merge/storage rewrites

## Product direction to encode
This is:
- ChatGPT-first
- conversation-first
- execution-first
- calm and local-first

This is **not**:
- ChatGPT-only forever as philosophy
- a general browser productivity suite
- a broad AI platform

## Future compatibility to preserve
Do not build these now, but do not block them:

### 1. Checklist library across conversations
Future shape:
- local-first list of saved checklists
- access to saved checklists outside the active conversation
- usable while browsing other sites

### 2. One paid AI action
Likely first candidate:
- AI Clean Up

But do not hard-lock it if later library/design work reveals a better first paid assistive action.

Rule:
- AI stays assistive, not central

## Success bar for this sprint
The sprint is successful when:
- the product feels like a focused premium extension
- the MVP still works exactly as expected
- all major user states feel deliberate
- screenshots look credible
- Cursor has not introduced feature creep

## Stop condition
Stop polishing when:
- hierarchy is clear
- all key states are coherent
- the list is easy to scan
- the archive feels deliberate
- the product looks shippable
- further work would mostly be taste, not product value