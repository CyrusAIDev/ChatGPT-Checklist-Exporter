# Golden QA

Use this to stop new work from breaking the product now that library exists.

## Rules
- test from the user point of view
- prefer real flows over theory
- if a core flow regresses, stop and fix it before adding more features

## Critical user flows

### 1. Capture from current chat
- open a saved `chatgpt.com/c/...` conversation
- capture checklist from latest assistant reply

Pass:
- checklist appears
- rows are readable
- active checklist is usable

### 2. Persist checked state
- check a few items
- reload tab or reopen panel elsewhere

Pass:
- checklist remains
- checked items remain checked

### 3. Merge revised plan
- ask ChatGPT to revise the plan
- merge latest

Pass:
- matched items keep checked state
- new items appear
- removed items archive
- no duplicates

### 4. No-op merge
- merge again without a meaningful source change

Pass:
- shows calm already-up-to-date feedback
- no meaningless merge summary
- no corruption

### 5. Library works outside ChatGPT
- open side panel on a non-ChatGPT site
- open Library
- open a saved checklist
- check/uncheck an item

Pass:
- library is useful
- state persists
- original chat opens correctly

### 6. Ordered step-by-step output
- ask ChatGPT for a clearly numbered process
- capture checklist
- later revise and merge it

Pass:
- checklist renders as ordered steps
- merge keeps ordered presentation
- checked state still behaves correctly

### 7. Reset remains safe
- reset checklist
- cancel once
- confirm once

Pass:
- cancel changes nothing
- confirm clears only that conversation record
- destructive hierarchy remains clear

### 8. AI Clean Up preview/apply
- run AI Clean Up on a saved checklist
- cancel once
- run again and apply

Pass:
- preview is understandable
- cancel leaves checklist unchanged
- apply updates only that checklist
- checked state remains sensible after apply

### 9. S1 parser + ordered presentation (capture regressions)
- capture from a reply that uses **GFM tasks** (`- [ ]` / `* [x]`) in normal markdown or fenced code-style blocks
- capture from a reply with a **short intro paragraph** then a **numbered** list
- capture from a **numbered HTML** answer where **images/cards** sit between step blocks (split `<ol>` fragments)
- capture from **emoji + numbered section headings** with bullet children under each section
- confirm **ordered** checklists show a **clear step column + checkbox + wrapping body** (not cramped)
- confirm **unordered / bullet** lists still look correct
- merge + no-op flows still behave after capture

Pass:
- checklist extracts the actionable rows (no false “empty capture” from valid lists)
- ordered steps stay visibly ordered in current chat and library detail
- merge identity still follows normalized text (step numbers are presentation only)

## Fail immediately if
- current chat capture gets weaker
- merge behavior becomes unpredictable
- library persistence breaks
- ordered steps get flattened again
- AI auto-applies without review
- the product gains scope that feels like a task manager