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