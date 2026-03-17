# Golden QA Checklist

This file is the final test contract for the premium polish sprint.

Use it to validate that polish work improves the experience without breaking the MVP.

## Rules

- test from the user’s point of view
- prefer real interaction over theoretical inspection
- preserve current MVP behavior
- do not accept visual polish that weakens clarity or reliability
- do not add scope during QA

## Core Functional QA

### 1. Saved conversation detection
- Open a real `chatgpt.com/c/...` conversation
- Open the side panel
- Confirm the panel detects the conversation correctly

Pass:
- no wrong unsupported state
- no confusing error state
- panel feels stable

### 2. Create checklist
- Ask ChatGPT for a bullet or numbered plan
- Open side panel
- Click **Create checklist**

Pass:
- checklist appears
- rows are readable
- primary action is obvious
- no broken state transition

### 3. Persistence
- Check 2–3 items
- Reload the tab
- Reopen the side panel

Pass:
- checklist remains
- checked items remain checked
- no duplicate or reset state

### 4. Wait while ChatGPT is generating
- Keep panel open
- Ask ChatGPT to revise the plan
- While ChatGPT is still responding, inspect the panel

Pass:
- Create/Merge are blocked or unavailable
- panel clearly tells the user to wait
- no partial content is merged

### 5. Merge latest
- After ChatGPT finishes, click **Merge latest**

Pass:
- unchanged items stay checked
- safe minor wording changes stay checked
- new items appear unchecked
- removed items move to archived
- nothing obviously wrong or duplicated

### 6. No-op merge
- Click **Merge latest** again without a new revision

Pass:
- “Already up to date” appears
- no corruption
- no duplicate items
- no confusing state

### 7. Archived section
- Expand archived after a merge that removed items

Pass:
- archived is collapsed by default
- archived feels secondary
- archived items are readable
- archived does not visually compete with active list

### 8. Reset
- Click **Reset checklist**
- Cancel once
- Then confirm reset

Pass:
- cancel keeps everything
- confirm removes only this conversation checklist
- reset remains clearly destructive

### 9. Unsupported / wrong page states
Test:
- chatgpt.com home or unsaved chat
- non-ChatGPT website

Pass:
- messages are clear
- states are visually distinct
- no misleading conversation-ready UI appears

### 10. Retry / no-response recovery
Where possible:
- open panel after extension reload or during flaky content-script availability

Pass:
- panel does not fail silently
- retry path is clear
- recovery language is understandable

## Premium UI QA

### 11. Header quality
Pass:
- top area feels intentional
- title/supporting text hierarchy is clear
- panel looks anchored, not generic

### 12. Action hierarchy
Pass:
- primary action is immediately obvious
- secondary actions are clearly secondary
- reset is visually isolated and destructive

### 13. Checklist readability
Pass:
- rows have enough breathing room
- checkbox and text alignment feel clean
- wrapped text stays readable
- completed items remain legible

### 14. State clarity
Pass:
- loading, unsupported, wait, info, retry, and error states feel visually related but distinct
- user can tell what to do next quickly
- panel avoids wall-of-text feeling

### 15. Progress feel
Pass:
- any progress summary feels useful and subtle
- no dashboard clutter
- does not distract from the checklist itself

### 16. Calmness
Pass:
- UI feels premium, not flashy
- spacing is consistent
- visual noise is low
- panel feels like a serious paid product

## Regression Guardrails

Fail QA if any of these happen:
- conversation detection becomes less reliable
- merge logic changes unexpectedly
- persistence weakens
- reset becomes unclear
- archived becomes confusing
- primary action becomes harder to find
- visual polish adds clutter
- current MVP behavior breaks

## Cursor Usage Rule

At the end of each polish phase:
1. run tests/build required by the phase
2. check affected items in this QA file
3. update `progress.md`
4. commit a checkpoint

At the end of the full polish sprint:
- run the full checklist in this file
- do not mark the sprint complete until all critical items pass