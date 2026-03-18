# Golden QA

Use this to stop polish work from breaking the MVP.

## Rules
- test from the user point of view
- prefer real flows over theory
- do not add scope during QA
- if core behavior regresses, stop and fix it before more polish

## Critical user flows

### 1. Create checklist
- open a saved `chatgpt.com/c/...` conversation
- generate a structured plan
- open side panel
- create checklist

Pass:
- checklist appears
- rows are readable
- primary action is obvious

### 2. Persist checked state
- check a few items
- reload the tab
- reopen panel

Pass:
- checklist remains
- checked items remain checked

### 3. Merge revised plan
- ask ChatGPT to revise the plan
- wait until generation finishes
- merge latest

Pass:
- matched items keep checked state
- new items appear
- removed items move to archive
- no duplicates

### 4. No-op merge
- merge again without a new revision

Pass:
- clear “already up to date” feedback
- no corruption
- no duplicate rows

### 5. Archived section
- expand archive after a merge that removed items

Pass:
- archive is secondary
- archived items are readable
- archive does not visually compete with active items

### 6. Reset
- click reset
- cancel
- click reset again
- confirm

Pass:
- cancel changes nothing
- confirm clears only this conversation checklist
- destructive action is clear

### 7. Unsupported / non-ready states
Test:
- non-ChatGPT page
- unsaved ChatGPT page
- generating state
- no assistant content state

Pass:
- message is short
- next action is clear
- UI still feels calm and coherent

## Fail immediately if
- conversation detection gets weaker
- persistence breaks
- merge logic changes unexpectedly
- archive behavior gets confusing
- reset becomes unclear
- the panel looks prettier but is harder to use