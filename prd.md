# Product Summary

This phase is a premium polish sprint for the existing MVP of Living Checklist for ChatGPT with Merge.

The product already works:
- detects a saved ChatGPT conversation
- creates one canonical checklist from the latest structured assistant output
- preserves checked state locally
- merges later revisions without wiping progress
- archives removed items
- supports destructive reset

This sprint improves how the product looks and feels without changing the core product scope or weakening the current functionality.

# Target User

A solo ChatGPT-heavy operator who uses one conversation to create and revise a plan, then wants a calm, premium, easy-to-scan execution surface.

# Core Problem

The MVP works, but the UI still feels like a functional extension shell instead of a polished paid product. The current experience needs stronger visual hierarchy, calmer states, better readability, and more confidence-inspiring interaction design.

# Product Promise

Keep the current MVP behavior intact, but make it feel premium, trustworthy, clear, and pleasant enough that a user would believe it is a paid-quality extension.

# Polish Sprint Scope

- improve side panel visual hierarchy
- improve spacing and typography
- improve header clarity
- improve action hierarchy
- improve checklist row readability
- improve state presentation:
  - unsupported
  - loading
  - retry / no response
  - waiting for ChatGPT to finish
  - no assistant content
  - no parseable checklist
  - already up to date
  - extraction failure
- improve archived section presentation
- add a small progress feel if it can be done without clutter
- preserve current create / merge / reset / persistence behavior
- preserve current architecture unless a tiny UI refactor is clearly helpful

# User Flow

1. User opens a saved ChatGPT conversation.
2. User opens the side panel.
3. The panel clearly communicates the current state:
   - unsupported
   - ready to create
   - checklist exists
   - waiting for ChatGPT
4. If no checklist exists, the user sees a clear premium empty state and one obvious action: **Create checklist**.
5. If a checklist exists, the user sees:
   - a clearer header
   - a subtle sense of progress
   - obvious primary action
   - readable checklist rows
   - archived items in a cleaner secondary section
6. When a merge happens, the result feels calm and understandable.
7. Reset remains destructive, clear, and visually separated.

# Functional Requirements

- do not change the core storage model
- do not change the core merge rules
- do not weaken persistence
- do not remove any current MVP states
- preserve create checklist flow
- preserve merge latest flow
- preserve reset confirmation flow
- preserve archived behavior
- preserve supported / unsupported detection behavior
- preserve wait-until-finished behavior while ChatGPT is generating
- any new progress indicator must be derived from existing checklist data only
- visual improvements must not require backend, auth, analytics, or new product features

# Non-Goals

- no checklist library yet
- no multiple checklists per conversation
- no AI features yet
- no backend or cloud sync
- no billing or payment flows
- no integrations
- no popup
- no options page
- no manual task editing UI
- no task-manager expansion
- no redesign of merge logic
- no architecture rewrite

# UX Requirements

- the UI must feel calm, premium, and easy to scan
- the side panel remains one-column
- the primary action must always be obvious
- reset must remain clearly destructive
- archived must remain clearly secondary
- the current state must be visually obvious without reading too much text
- the empty state must feel intentional, not blank
- checklist rows must be more comfortable to scan and check off
- completed progress should be visible in a subtle way
- the panel should feel polished, not flashy
- do not add clutter
- do not make the panel look like a mini web app dashboard

# Technical Constraints

- keep Chrome extension architecture as-is unless a very small UI refactor is needed
- no new permissions unless absolutely required
- no backend
- no network requests
- no analytics
- no new dependencies unless clearly worth it
- prefer CSS variables, small presentational components, and simple structure over UI frameworks
- keep performance light

# Visual Direction

Use a design direction inspired by:
- Todoist-level clarity
- Superlist-level polish
- Any.do-level friendliness

Translate that into:
- cleaner spacing
- stronger typography hierarchy
- clearer section surfaces
- stronger action hierarchy
- calmer state panels
- more intentional empty and error visuals
- better archived section treatment
- subtle progress feel without clutter

# Future Compatibility

This polish sprint must not block future work on:
- checklist library across conversations
- using saved checklists while browsing other sites
- one paid AI action for checklist cleanup / organization / expansion

Do not build those features now. Only preserve clean seams for them.

# Acceptance Criteria

- the current MVP functionality still works end-to-end
- the side panel looks more premium and deliberate
- the main state of the panel is obvious at a glance
- the checklist is easier to scan and interact with
- create / merge / reset remain reliable
- loading / retry / wait states are clearer
- archived feels intentional and secondary
- the UI polish does not introduce scope creep
- no banned scope is added

# Final Constraint Reminder

This is a polish sprint, not a feature sprint.

The goal is to make the current MVP feel premium without changing the core product scope, without breaking current behavior, and without building future features early.