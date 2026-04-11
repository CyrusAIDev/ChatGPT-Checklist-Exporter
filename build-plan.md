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

## Phase S1 — Ordered-Step Preservation + Parser Stabilization

**Status: code complete, pending manual QA**

### What was done
- DOM extraction: `li.innerText` replaced with own-text extraction; nested ol/ul removed from primary text, appended as paragraph-separated body
- Parser: `parseDomListItemText` preserves paragraph breaks for title/body split
- Parser: ordered HTML grouping — interleaved ul items grouped under preceding ol items
- Parser: ordered text grouping — numbered lines and emoji section headings become parent items with child lines as body
- Parser: emoji section headings produce a single ordered parent item (no longer child-only flat rows)
- Ordered-row CSS: tighter grid, more vertical breathing room, step number visually secondary
- 41 parser tests covering: nested bullets under ordered parents, interleaved ol/ul, emoji parent sections, GFM checkboxes, intro+list, media split, merge stability

### Definition of done
- ordered source remains visibly ordered after capture
- ordered source remains visibly ordered after merge
- nested bullets don't flatten into separate items
- emoji/numbered section headings are preserved as parent items
- unordered lists still render normally
- current chat and library detail both work

### Auto verification
- `npm run build`
- `npm test`

### Minimal manual QA
1. Clean numbered step-by-step response
2. Markdown checkbox response (`- [ ]`)
3. Intro sentence + numbered list + extra bullets
4. Numbered steps with nested bullets
5. Numbered steps with images/media between heading and details
6. Emoji/section-heading checklist
7. Current bullet-list behavior still works
8. Merge and no-op still work after capture
9. Library detail preserves ordered rendering

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