# Progress

**Progress bar:** `[########-] 90%`
**Current phase:** S1 — Ordered-step preservation (still in progress)
**Current focus:** S1 stabilization — parser edge cases (GFM `- [ ]`, intro + numbered list, emoji section headings, companion `<pre>` text) and ordered-row layout in the side panel; merge and normalization unchanged.

## Completed
- polished side-panel MVP
- merge/storage/checklist model hardened
- source-selection stabilized
- checklist library across conversations
- current chat + library view switching
- search/sort/open-original-chat library behavior
- S1 partial: `sourceStructure` on records, numbered UI when ordered, merge identity by normalized text; chat + library detail
- S1 stabilization pass: GFM task list parsing, intro skip before strong lists, emoji section heading + child bullets → flat prefixed items, `innerText` + standalone task-like `<pre>` in latest message text, ordered row grid (step / checkbox / content) + optional title vs body split for multiline ordered items

## In Progress
- **S1 — Ordered-step preservation** (remaining manual QA: real ChatGPT threads — GFM tasks, intro+list, media between steps, emoji sections; merge/no-op; library detail ordered layout)
- doc sync for the post-library stage (other control docs may still be edited locally)

## Next
- Finish S1 verification, then S2 AI Clean Up MVP
- S3 launch assets / icon / listing
- launch submission + sharing

## Blockers
- none

## Decisions locked
- library is already built; do not rebuild it
- current next feature is not “more polish”
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
