# Living Checklist — Launch Progress
> Updated automatically at the end of each session. Read this at the start of every new session.

---

## Overall status
```
Free tier submission ██████████████████████░░  90%
Premium gate (no Stripe yet) ██████████████████░░░░░░  75%
Chrome Web Store SEO  ████████░░░░░░░░░░░░░░░░  33%
──────────────────────────────────────────────────
Launch readiness      ████████████████░░░░░░░░  66%
```

---

## Completed 2026-07-09 (premium gate session)

| # | What | Where |
|---|------|-------|
| ✅ | **Supabase project restored** (was paused — cause of "Failed to fetch") | Dashboard |
| ✅ | **`profiles` table created** — is_pro column, RLS (users read own row), auto-create trigger on signup, backfill for the 1 existing user | Migration ran via Management API |
| ✅ | **`grant-pro` edge function deployed** — flips is_pro=true for the authenticated caller; Stripe webhook will reuse this later | `supabase/functions/grant-pro/` |
| ✅ | **isPro state wired into App.tsx** — fetched on sign-in + session restore; all premium gates now check `!isPro` instead of `!authUser` | `App.tsx`, `profiles.ts` |
| ✅ | **Upgrade to Pro flow** — button in AuthPrompt (Library tab); locked Organize/smart-merge buttons also trigger upgrade | `AuthPrompt.tsx`, `ChecklistActionBar.tsx` |
| ✅ | Both edge functions ACTIVE (`clean-checklist`, `grant-pro`); 97/97 tests | — |

**Test flow (works now):** Library tab → sign in via email OTP → shows "✓ Free · email" → click **Upgrade to Pro** → instantly "★ Pro" → Organize + smart merge unlocked. Same UX a paying customer gets; Stripe checkout later just replaces the button's direct call.

---

## Completed 2026-05-19 (bug-fix session)

| # | What | Files changed |
|---|------|--------------|
| ✅ | **Merge + smart merge fixed** — removed silent `catch {}`, smart merge now shows "Merging… → Organizing…" phases, AI errors are surfaced instead of silently falling back | `App.tsx`, `ChecklistActionBar.tsx` |
| ✅ | **List disappears bug fixed** — `reFetchFromTabReady` no longer sets page state to "loading" (which cascaded into clearing the checklist). Checklist stays visible during tab re-fetches | `App.tsx` |
| ✅ | **Orphaned item bug fixed** — `applyOrganizeResult` now validates each item's groupId against the new groups array; orphaned items fall to the ungrouped fallback instead of disappearing | `App.tsx` |
| ✅ | **Loading animation improved** — Organize button shimmers during AI call; label cycles through "Analyzing… → Grouping tasks… → Cleaning up… → Almost done…" to reduce perceived wait | `App.tsx`, `ChecklistActionBar.tsx`, `sidepanel.css` |
| ✅ | **UI contrast improved** — Auth prompt changed from light mint green to white+border; header eyebrow font made bolder and darker; subtitle text contrast increased | `sidepanel.css` |
| ✅ | **All tests pass** — 97/97 | — |

---

## Remaining before launch

### Must-do (blocking launch)
- [ ] **Task A — GitHub Pages** *(15 min, no code)* — Go to [repo Settings → Pages](https://github.com/CyrusAIDev/ChatGPT-Checklist-Exporter/settings/pages), set branch: `main`, folder: `/docs`. Privacy URL will be `https://cyrusaidev.github.io/ChatGPT-Checklist-Exporter/privacy.html`
- [ ] **Task B — Chrome Web Store SEO** *(30 min, no code)* — Fill listing at https://chrome.google.com/webstore/devconsole with name, description, keywords from PRD.md Task B
- [ ] **Task C — Submit zip** *(10 min)* — Run `cd .output && zip -r living-checklist.zip chrome-mv3/`, upload to Web Store

### Nice-to-have before launch
- [ ] **More UI polish** — Fonts and logo contrast the user flagged (the wand emoji on green, auth prompt area). Foundation improved this session; more refinement possible
- [ ] **Faster organize** — The AI call itself (Claude Haiku) takes 3-8 seconds; can't be eliminated, but perceived speed improved with shimmer + label cycling

### Post-launch (Task D)
- [ ] **Stripe premium gate** — See `PRD.md` Task D for full spec (~2-3 hrs)

---

## Known bugs (not blocking launch)
| Bug | Status |
|-----|--------|
| Inline editing only works in grouped mode (after Organize) | Low priority |
| 🪄 emoji may render as ✏️ on some Windows fonts | Won't fix |
| No drag-to-reorder | Out of scope |

---

## How to pick up next session
1. Read this file first
2. Run `pnpm test` to confirm 97 passing
3. Run `pnpm build && cp -r .output/chrome-mv3/ extension/`
4. Check the task list above — highest priority items are at the top

---

## Quick commands
```bash
cd /Users/cyrusghoreishi/Desktop/chrome-ext-starter
pnpm build && cp -r .output/chrome-mv3/ extension/
pnpm test
cd .output && zip -r living-checklist.zip chrome-mv3/  # submit zip
```
