# Technical Spec — Premium Polish Sprint

## Primary rule
Protect the working core. Improve presentation and small product-facing behavior only.

## Protected code areas
Do not casually rewrite these:
- `src/lib/merge/*`
- `src/lib/storage/*`
- `src/lib/chatgpt/parse-checklist.ts`
- `src/lib/chatgpt/normalize-item.ts`
- `src/lib/chatgpt/extract-latest-assistant-message.ts`
- `src/types/checklist.ts`

These files define the actual MVP and are the highest regression risk.

## Allowed change areas
Safe primary change areas:
- `src/entrypoints/sidepanel/App.tsx`
- `src/components/*`
- `src/styles/sidepanel.css`
- `src/entrypoints/sidepanel/*`
- `public/*` branding assets

Limited change areas:
- `src/entrypoints/background.ts`
- `src/types/messages.ts`

Only touch limited areas if required for:
- clearer ChatGPT-first behavior
- cleaner panel relevance
- recovery reliability
- future seam preservation

## UI architecture cleanup allowed
Allowed:
- split large sidepanel UI into small presentational components
- move render-only chunks out of `App.tsx`
- extract repeated state-card UI
- extract checklist list / archive / action bar UI
- centralize copy strings if it reduces duplication

Not allowed:
- introducing a large state machine library
- changing the core data flow
- moving business logic out of current core files without a bug-driven reason
- broad folder re-org

## Recommended component extraction ceiling
Keep it small.
Good targets:
- `PanelHeader`
- `StatusCard`
- `ActionBar`
- `ChecklistList`
- `ArchivedSection`
- `ResetConfirmDialog`

Rule:
- `App.tsx` can still own orchestration state
- extracted components should be mostly presentational
- business rules stay near current handlers

## Styling and token rules
Use one deliberate token system in `sidepanel.css`.

### Required token groups
- app background
- panel/surface
- subtle surface
- strong text
- muted text
- border
- accent
- accent hover/pressed
- danger
- focus ring
- radius
- spacing scale
- type scale
- shadow (minimal)

### Starting palette
Use this unless contrast fails:
- background: warm neutral
- panel: white
- subtle surface: very light neutral
- text strong: deep ink/slate
- text muted: cool gray
- accent: muted evergreen
- danger: muted brick

Suggested first-pass values:
- `--bg-app: #f6f4ef`
- `--bg-panel: #ffffff`
- `--bg-subtle: #f3f4f6`
- `--text-strong: #18202a`
- `--text-muted: #5d6773`
- `--border: #e7e1d7`
- `--accent: #2f6b57`
- `--accent-hover: #255847`
- `--danger: #a14a3b`
- `--focus: #2f6b57`

### Typography rules
No custom font loading.
Use system stack only.

Use only:
- title
- section/meta
- body
- micro/meta

Weight discipline:
- 600 for titles
- 500 for actions/section labels
- 400 for body

Do not add decorative type.

### Spacing rules
- prefer larger vertical rhythm over dense packing
- keep one-column layout
- list rows should breathe
- state cards should not feel cramped
- avoid tiny gaps and avoid oversized empty holes

## Button hierarchy rules
Exactly three levels:
- primary
- secondary
- destructive

Rules:
- only one obvious primary action per surface
- destructive action must be visually separated
- no ghost buttons unless clearly secondary and text-light
- loading/disabled states must remain readable

## State-handling rules
Keep the existing state model.
Do not invent new product states unless needed for clarity.

Required treatment:
- loading
- unsupported page / no conversation
- no response / retry
- generating
- no assistant content
- no checklist yet
- merge success / already up to date
- wrong conversation
- reset confirmation

Rules:
- every state must answer “what is happening” and “what should I do next”
- copy must be short
- error surfaces must not feel alarming unless action is destructive
- info surfaces must be calmer than errors

## Accessibility and usability constraints
Must keep or add:
- keyboard operable buttons
- visible focus states
- proper button semantics
- checkbox label clickability
- readable contrast
- `aria-live` only where actually useful
- no motion dependency

Do not:
- hide important meaning by color alone
- rely on hover for critical behavior
- make archive/reset hard to understand

## ChatGPT-first behavior rule
Current product stays centered on ChatGPT conversations.

During this sprint:
- optimize create/merge flows for saved ChatGPT conversations
- do not add browsing-time checklist workflows yet
- do not use copy that implies the product will never work elsewhere

Good copy pattern:
- “Open a saved ChatGPT conversation to create or update a checklist.”

Avoid copy pattern:
- “This extension is only useful on ChatGPT.”

## Future compatibility rules
Preserve clean seams for:
- checklist library across conversations
- use of saved checklists while browsing other sites
- one paid AI action

Do this by:
- keeping checklist records conversation-keyed
- not hard-coding UI language around “only one place forever”
- keeping sidepanel UI modular enough to later support a library surface
- keeping AI as a later transform step on checklist content, not a core dependency

Do not build future features now.

## Testing rules
Cursor should do as much verification as possible.

Default:
- run `npm run build` after each completed phase
- run targeted tests when touching logic
- run full `npm test` before closing the sprint

Manual QA should stay minimal and high-value.

If local dependency state is broken because the uploaded repo contains stale `node_modules`:
- do one clean reinstall
- continue
- do not turn dependency cleanup into a project