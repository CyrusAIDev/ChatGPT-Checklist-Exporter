# Build Plan — Post-Library Stage

## Mission
Finish the next two value milestones fast:
1. ordered-step preservation
2. AI Clean Up MVP

Then stop feature work and move to launch assets.

## Non-negotiables
- preserve current chat flow
- preserve library behavior
- preserve local-first deterministic core
- no feature creep
- no backend-heavy work
- no broad refactors

## Always read first
- `@prd.md`
- `@technical-spec.md`
- `@build-plan.md`
- `@progress.md`
- `@golden-qa.md`

## Default execution loop
For each phase:
1. read the phase
2. change only what the phase requires
3. run verification
4. do the listed manual QA only
5. update `progress.md`
6. create a git checkpoint
7. stop and report

## Report format after each phase
- phase completed
- files changed
- tests added/updated
- commands run
- manual QA for me now
- blockers
- progress updated: yes/no
- git checkpoint hash

---

## Phase S1 — Ordered-Step Preservation

### Cursor does
- inspect current parse/render path
- preserve ordered source structure for step-by-step outputs
- add the smallest metadata needed
- render ordered records as numbered steps
- keep checklist behavior the same

### Must produce
- step-by-step output still feels like steps
- merge behavior stays deterministic
- library detail also respects ordered presentation

### Do not do
- no subtasks
- no nested flows
- no AI work yet
- no broad schema redesign

### Definition of done
- ordered source remains visibly ordered after capture
- ordered source remains visibly ordered after merge
- unordered lists still render normally
- current chat and library detail both work

### Auto verification
- `npm run build`
- `npm test`

### Minimal manual QA
1. Ask ChatGPT for a clearly numbered step-by-step process
2. Capture checklist
3. Confirm it renders as numbered steps, not a generic unordered list
4. Ask ChatGPT to revise the steps
5. Merge and confirm order + checked state still behave correctly
6. Open the same checklist from Library and confirm ordered rendering there too

### Update progress
- mark S1 complete
- set current phase to S2

### Git checkpoint
- required

---

## Phase S2 — AI Clean Up MVP

### Cursor does
- add one assistive AI action only: `AI Clean Up`
- make it available on saved checklist views
- create preview-before-apply flow
- keep the action narrow and trustworthy

### Must produce
- user can run AI Clean Up on one saved checklist
- preview shows the proposed cleaned checklist
- cancel does nothing
- apply updates the checklist deterministically
- checked state is preserved conservatively where matches are clear

### Product boundary
AI Clean Up may:
- tighten wording
- remove obvious duplicates
- standardize phrasing
- lightly clarify vague items

AI Clean Up may not:
- invent a big new plan
- add dates/priorities/tags
- create subtasks
- auto-apply without preview

### Definition of done
- AI Clean Up works from current chat checklist view
- AI Clean Up works from library detail view
- preview is readable
- apply is safe and understandable
- current non-AI flows still work

### Auto verification
- `npm run build`
- `npm test`

### Minimal manual QA
1. Run AI Clean Up on a messy saved checklist
2. Confirm preview is understandable
3. Cancel once and confirm nothing changes
4. Apply once and confirm checklist is cleaner
5. Confirm check/uncheck still works after apply
6. Confirm library and current chat both still behave correctly

### Update progress
- mark S2 complete
- set current phase to S3

### Git checkpoint
- required

---

## Phase S3 — Launch Assets and Stop

### Cursor does
- finish icon/logo pass
- tighten product-facing copy only if clearly needed
- prepare launch-ready assets/tasks list
- stop feature work

### Definition of done
- extension has a credible icon/logo
- launch asset checklist is clear
- no more product feature scope is added

### Auto verification
- `npm run build`

### Minimal manual QA
- sanity check icon/logo in Chrome UI
- sanity check screenshots can be captured cleanly

### Update progress
- mark S3 complete
- set next milestone to launch submission/share

### Git checkpoint
- required