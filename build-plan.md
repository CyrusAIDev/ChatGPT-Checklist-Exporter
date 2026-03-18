# Build Plan — Execute One Phase At A Time

## Mission
Finish the premium brand / polish sprint fast without breaking the MVP.

## Non-negotiables
- preserve current MVP behavior
- protect merge/storage/conversation identity core
- no feature creep
- no future-feature building
- no backend work
- no broad refactors
- ship the polished MVP before library or AI work

## Always read first
- `@prd.md`
- `@technical-spec.md`
- `@build-plan.md`
- `@progress.md`
- `@golden-qa.md` if present

## Default execution loop
For each phase:
1. read the phase
2. change only what the phase requires
3. run verification
4. do the minimal manual QA listed for the phase
5. update `progress.md`
6. create a git checkpoint
7. stop and report

## Report format after each phase
Keep the report short:
- phase completed
- files changed
- commands run
- manual QA for me now
- blockers
- progress updated: yes/no
- git checkpoint hash

## Setup rule
If build/test fails because the uploaded repo’s packaged dependencies are stale:
- do one clean reinstall
- continue
- do not spend time beautifying the repo

---

## Phase P0 — Baseline Lock

### Cursor does
- confirm protected files vs UI-facing files
- confirm current MVP behavior from code
- replace stale planning docs with this new system
- set `progress.md` to the correct starting state

### Definition of done
- docs are aligned
- protected boundaries are clear
- next phase is unblocked

### Auto verification
- none beyond file sanity

### Minimal manual QA
- none

### Update progress
- mark P0 complete
- set current phase to P1

### Git checkpoint
- required

---

## Phase P1 — Brand Surface and Visual Tokens

### Cursor does
- install a clean token system in `sidepanel.css`
- upgrade header hierarchy and shell
- replace generic product-facing copy with calmer premium copy
- improve icon direction only if assets are ready and change is low-risk
- keep naming provisional; do not hard-lock final brand

### Must produce
- better top-of-panel hierarchy
- cleaner spacing rhythm
- more deliberate color system
- more credible product feel in first glance

### Do not do
- no library UI
- no AI UI
- no functional feature expansion

### Definition of done
- panel no longer looks like a starter
- title/supporting text/action area feel intentional
- color and spacing feel coherent

### Auto verification
- `npm run build`

### Minimal manual QA
- open one real saved ChatGPT conversation
- open side panel
- sanity check: first impression feels calmer and more deliberate

### Update progress
- mark P1 complete
- set current phase to P2

### Git checkpoint
- required

---

## Phase P2 — Checklist View and Action Hierarchy

### Cursor does
- polish primary/secondary/destructive action hierarchy
- improve checklist row spacing and scanability
- improve checkbox/text alignment
- improve checked-state treatment
- keep merge summary and progress summary subtle
- extract presentational list/action components only if it reduces `App.tsx` clutter

### Must produce
- obvious primary action
- easier scanning
- long text remains readable
- completed items still legible

### Definition of done
- active checklist view feels premium and calm
- no clutter added
- action hierarchy is obvious within 3 seconds

### Auto verification
- `npm run build`

### Minimal manual QA
- create checklist
- check/uncheck a few items
- merge latest once
- confirm it is easier to scan than before

### Update progress
- mark P2 complete
- set current phase to P3

### Git checkpoint
- required

---

## Phase P3 — States, Archive, and Reset

### Cursor does
- unify all non-happy-path state surfaces
- polish loading/error/info/empty states
- make archive feel clearly secondary but still readable
- make reset feel deliberate and safe
- keep copy short and useful

### Required states
- loading
- no response / retry
- unsupported or no saved conversation
- generating
- no assistant content
- no checklist yet
- already up to date
- wrong conversation

### Definition of done
- state surfaces look like one product
- archive is cleaner
- reset is clear and safely destructive

### Auto verification
- `npm run build`

### Minimal manual QA
- open unsupported page
- open saved conversation with no checklist
- test archive expand/collapse
- test cancel reset then confirm reset

### Update progress
- mark P3 complete
- set current phase to P4

### Git checkpoint
- required

---

## Phase P4 — ChatGPT-First Relevance and Ship Pass

### Cursor does
- tighten product relevance for current MVP
- improve unsupported-page messaging
- keep path open for future library use outside ChatGPT without building it
- do final copy cleanup
- remove only confusing repo/project leftovers that directly hurt shipping confidence
- no vanity cleanup

### Allowed minimal behavior tweaks
- sidepanel relevance behavior
- copy and UI around active-tab support
- minor background/message cleanup tied to relevance or reliability

### Definition of done
- product feels intentionally ChatGPT-first now
- current copy does not trap future library direction
- no obvious shipping-risk confusion remains

### Auto verification
- `npm run build`
- `npm test`

### Minimal manual QA
- saved conversation happy path
- unsupported page messaging
- checklist persists after reload
- merge still preserves checked state

### Update progress
- mark P4 complete
- set current phase to P5

### Git checkpoint
- required

---

## Phase P5 — Final QA and Stop

### Cursor does
- run `@golden-qa.md`
- fix only true polish regressions or MVP breakage
- stop when product is clearly shippable
- do not continue taste-only iteration

### Stop rule
If remaining issues are cosmetic preferences rather than trust, readability, or shipping confidence, stop.

### Definition of done
- core flows pass
- polish is coherent
- no major regressions
- progress file says sprint complete

### Auto verification
- `npm run build`
- `npm test`

### Minimal manual QA
Run only these:
- create checklist
- merge revised checklist
- confirm checked items survive
- confirm archive works
- confirm reset works
- confirm unsupported page message is clear

### Update progress
- mark sprint complete
- set next milestone to checklist library planning

### Git checkpoint
- required

---

## After this sprint — not now
### Next milestone
Checklist library across conversations.

### After that
One paid AI action.
Default candidate: AI Clean Up.
Do not choose/build it during this sprint unless a later milestone explicitly says so.