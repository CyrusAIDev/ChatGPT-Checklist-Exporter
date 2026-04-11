# Progress

**Progress bar:** `[#########] 95%`
**Current phase:** S1 — Ordered-step preservation (complete, pending manual QA)
**Current focus:** Manual QA of S1 parser/ordered stabilization; then S2 AI Clean Up

## Completed
- polished side-panel MVP
- merge/storage/checklist model hardened
- source-selection stabilized
- checklist library across conversations
- current chat + library view switching
- search/sort/open-original-chat library behavior
- S1 partial: `sourceStructure` on records, numbered UI when ordered, merge identity by normalized text; chat + library detail
- S1 stabilization pass 1: GFM task list parsing, intro skip before strong lists, `innerText` + standalone task-like `<pre>` in latest message text
- **S1 stabilization pass 2 (this checkpoint):**
  - DOM extraction: `li.innerText` replaced with own-text extraction (nested `ol`/`ul` removed from primary text, appended as paragraph-separated supporting body)
  - Parser: `parseDomListItemText` preserves paragraph breaks (`\n\n`) so `OrderedItemBody` can split title from body
  - Parser: ordered HTML grouping — interleaved `ul` items grouped as supporting text under preceding `ol` items when strong ordered structure detected
  - Parser: ordered text grouping — numbered lines or emoji section headings become parent items; child bullets/text grouped as body
  - Parser: emoji section headings produce a single ordered parent item per section (no longer flattened into child-only prefixed rows)
  - Parser: intro prose still skipped before strong list blocks
  - Ordered-row CSS: tighter grid columns, more vertical breathing room, step number more muted/secondary
  - 41 parser tests passing (new: nested bullets under ordered parents, interleaved ol/ul grouping, emoji parent sections, GFM checkboxes, intro+list, media split, merge fingerprint stability)

## In Progress
- **S1 manual QA** — real ChatGPT threads: GFM tasks, intro+list, numbered+nested, media between steps, emoji sections, merge/no-op, library detail ordered layout

## Next
- S2 AI Clean Up MVP
- S3 launch assets / icon / listing
- launch submission + sharing

## Blockers
- none

## Decisions locked
- library is already built; do not rebuild it
- current next feature is not "more polish"
- preserve ordered source structure when the source is sequential
- first AI action = AI Clean Up
- AI must be assistive, preview-first, and narrow
- no backend-heavy work before launch
- no broad task-manager expansion

## Scope rejected
- subtasks
- due dates / priorities / tags
- multiple AI actions at once
- cloud sync
- team features
- folders/projects
- workspace expansion
- backend-heavy architecture
- broad refactors

## Resume rule for a new Cursor chat
1. Read `@prd.md`
2. Read `@technical-spec.md`
3. Read `@build-plan.md`
4. Read `@progress.md`
5. Read `@golden-qa.md`
6. Complete exactly one phase
7. Update this file
8. Create a git checkpoint
