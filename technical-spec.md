# Technical Spec — Ordered Steps + AI Clean Up

## Primary rule
Protect the working core. Extend it narrowly.

## Current repo reality
Already built and should be preserved:
- polished side panel
- merge/storage hardening
- checklist library
- current chat + library view switching

Do not re-solve already solved work.

## Protected code areas
Do not casually rewrite:
- `src/lib/merge/*`
- `src/lib/storage/*`
- `src/lib/chatgpt/extract-latest-assistant-message.ts`
- `src/lib/chatgpt/normalize-item.ts`
- `src/types/checklist.ts`

These are core behavior files.

## Allowed change areas
Primary safe areas:
- `src/lib/chatgpt/parse-checklist.ts`
- `src/types/checklist.ts`
- `src/entrypoints/sidepanel/App.tsx`
- `src/components/*`
- `src/components/library/*`
- `src/styles/sidepanel.css`

Secondary allowed areas:
- storage repo/query helpers
- small new helper files under `src/lib/chatgpt/*` or `src/lib/ai/*`
- `src/types/messages.ts` only if needed
- narrow companion updates to `src/lib/chatgpt/extract-latest-assistant-message.ts` for message text assembly (e.g. markdown `innerText`, fenced `<pre>`) when chooser rules and merge identity stay unchanged

### Parser coverage (S1 checklist capture)
The text + DOM parser should recognize, without broadening product scope:
- native `ol` / `ul` list items (document order, including across split lists when each fragment is a real list)
- GFM task lines: `- [ ] item`, `* [x] item`, plus standalone `[ ]` / `[x]` lines
- plain numbered lines (`1.`, `2)`, …) and bullets after optional intro prose (intro skipped only when a strong list block is detected)
- emoji-prefixed numbered section headings (e.g. `🧠 1. Title`) whose following bullets/indents become supporting body text under the section parent item

### DOM extraction rules
- `li` text is extracted as "own text" (nested `ol`/`ul` removed from clone); nested list content is appended as a paragraph-separated supporting body
- `collectOutermostDirectListItems` filters nested `li` elements to avoid duplicating parent+child

### Ordered structure detection
- DOM path: when `≥ 2` ordered HTML list items exist, interleaved `ul` items are grouped as supporting text under the preceding `ol` item (handles ChatGPT split-list patterns from media/images)
- Text path: when `≥ 2` top-level numbered lines or `≥ 1` emoji section heading exists, child/body lines are grouped under each parent step instead of becoming separate checklist items
- Intro prose before the first strong list block is always skipped

### Ordered rendering rules
- Step numbers are rendered from array order, not stored source numerals
- Merge identity is normalized text, not displayed number
- Ordered rows use a 3-column grid: muted step number, checkbox, content column
- `OrderedItemBody` splits on `\n\n` to show title + supporting body when multiline

## Ordered-step preservation rules

### Required model extension
Add the smallest clean structure metadata needed to preserve presentation.

Preferred direction:
- record-level source structure field, e.g.
  - `ordered`
  - `unordered`
  - `checkbox`
  - `mixed` only if truly needed

Bias:
- keep this at record level unless the code clearly needs more detail
- do not create a big schema

### Extraction rules
When parsing the latest assistant reply:
- preserve whether the source came from ordered list structure
- preserve whether the source came from unordered/checkbox structure
- do not use visible numbering as item identity

### Merge rules
Merge must continue to match by normalized text, not visible step number.

Meaning:
- if step 2 becomes step 3 because order changed, matching should still work by text
- reorder-only changes should still update order
- step numbering is presentation, not identity

### Rendering rules
For ordered records:
- render numbered step markers
- keep check/uncheck behavior unchanged
- keep archived section behavior unchanged

Do not:
- build subtasks
- build nested workflow UI
- build dependencies

## AI Clean Up rules

### Product boundary
One narrow assistive action only:
- `AI Clean Up`

No other AI actions in this milestone.

### Action behavior
Input:
- current saved checklist record
- active items only
- optional archived items ignored for the cleanup pass

Output:
- proposed cleaned active item list
- no direct write on generation
- preview before apply

### AI output constraints
AI must not:
- invent a large new plan
- add dates/priorities/tags
- create subtasks
- change the product into a planner

AI may:
- tighten wording
- remove obvious duplicates
- standardize phrasing
- lightly clarify vague items

### Apply behavior
Applying AI Clean Up should:
- preserve checked state conservatively where matches are clear
- preserve archived items unless intentionally untouched
- use a deterministic apply path
- avoid silent destructive overwrite

Preferred implementation direction:
- treat AI output as a proposed revised active-item list
- apply through a deterministic transformation layer
- reuse existing merge/matching logic where sensible instead of inventing a separate state system

### Provider seam
Keep the provider seam small and swappable.
Do not build a large provider abstraction.

## UI rules
- AI action available only when a saved checklist exists
- show action in:
  - current chat checklist view
  - library detail view
- preview must be readable and compact
- one clear primary action:
  - `Apply clean up`
- one safe exit:
  - `Cancel`

## Accessibility/usability rules
- AI preview must be easy to scan
- no auto-apply
- no hidden destructive behavior
- step numbering must remain readable at small side-panel width
- focus states must remain visible

## Testing rules
Cursor should do as much verification as possible.

Required for ordered-step work:
- parse ordered source and preserve structure
- ordered records render in order
- merge still matches by normalized text, not visible number

Required for AI Clean Up:
- preview state appears only for saved checklist
- apply preserves checked state where expected
- cancel leaves record unchanged
- library detail and current chat both still work after AI code lands

## Stop rules
Do not:
- redesign the panel again
- add more AI actions
- add billing
- add backend-heavy architecture
- refactor the app into a large state machine