# Living Checklist — CLAUDE.md

> **Scope guard:** This project has ONE goal — ship to Chrome Web Store today with a free tier and a premium (Stripe) gate. Do not add features outside the checklist below. When in doubt, do less.

---

## Launch Progress

```
Free tier submission ████████████████████░░░░  80%
Premium (Stripe) gate ░░░░░░░░░░░░░░░░░░░░░░░░   0%
Chrome Web Store SEO  ████████░░░░░░░░░░░░░░░░  33%
```

### Today's Checklist
- [x] Version bump → 1.0.0 (`wxt.config.ts`)
- [x] Privacy policy (`docs/privacy.html`)
- [x] Edge function token limit fixed (8192)
- [x] Organize bug fixed (JSON parse error)
- [x] Smart merge works without pre-existing groups
- [x] Loading spinner on Organize + Merge buttons
- [x] "Check again" replaced with reliable "Refresh page"
- [x] UI contrast improved (Apple look, solid smart-merge toggle)
- [ ] **Enable GitHub Pages** for privacy policy URL (Settings → Pages → `/docs`)
- [ ] **Chrome Web Store SEO** — update title, description, category in listing
- [ ] **Zip and submit** — `cd .output && zip -r living-checklist.zip chrome-mv3/`
- [ ] **Stripe premium gate** — swap `!authUser` → `!isPro`, add `profiles.is_pro` to Supabase

---

## Critical Rules (never violate)
1. **Never touch** `src/lib/merge/merge-checklist.ts` or `src/lib/storage/`
2. **Always** run `pnpm build && cp -r .output/chrome-mv3/ extension/` after any change
3. **Always** keep `pnpm test` at 97 passing
4. **All styles** go in `src/styles/sidepanel.css` — no inline styles, no CSS modules
5. `.env` must exist at repo root or build fails

---

## Stack & Commands
```bash
# Build
pnpm build && cp -r .output/chrome-mv3/ extension/

# Test (must stay at 97)
pnpm test

# Deploy edge function
supabase functions deploy clean-checklist --project-ref hnzowqseruvxypyutwcc

# Zip for Web Store
cd .output && zip -r living-checklist.zip chrome-mv3/
```

## Infra
- **Supabase project:** `hnzowqseruvxypyutwcc`
- **GitHub repo:** `https://github.com/CyrusAIDev/ChatGPT-Checklist-Exporter`
- **pnpm dev is broken** in WXT 0.15.4 — always use `pnpm build`
- **`.env`** at repo root has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Anthropic key** stored as Supabase secret only (never in extension)

## Key Files
| File | Purpose |
|------|---------|
| `wxt.config.ts` | Extension manifest + version |
| `src/entrypoints/sidepanel/App.tsx` | Main React app (~1060 lines) |
| `src/components/ChecklistActionBar.tsx` | Organize, Merge, smart-merge, share buttons |
| `src/styles/sidepanel.css` | All styles — CSS tokens at top |
| `supabase/functions/clean-checklist/index.ts` | AI organizer edge function |
| `docs/privacy.html` | Privacy policy (served via GitHub Pages) |

## Data Model (read-only reference)
```ts
// updatedAt is always number (timestamp) — never .toISOString()
type ChecklistGroup = { id: string; name: string; collapsed: boolean; order: number; parentId?: string }
type ChecklistItem  = { id: string; text: string; checked: boolean; archived: boolean; order: number; groupId?: string }
```

## CSS Tokens (reference)
```
--accent: #2f6b57   --text-strong: #0f1923   --text-muted: #5d6773
--bg-panel: #fff    --bg-muted: #eceae4       --border: #e7e1d7
--danger: #a14a3b   --radius-sm: 8px          --radius-md: 10px
```

---

## Stripe Setup (Task 10 — Premium Gate)
When ready:
1. Create Stripe account → get `STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY`
2. `supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref hnzowqseruvxypyutwcc`
3. Add `profiles` table column: `ALTER TABLE profiles ADD COLUMN is_pro BOOLEAN DEFAULT false;`
4. In `App.tsx`: replace all `!authUser` premium gates with `!isPro` (where `isPro = authUser && profile?.is_pro`)
5. Create Supabase edge function `stripe-webhook` to set `is_pro = true` on successful payment

## Chrome Web Store SEO (Task 11)
Listing URL: https://chrome.google.com/webstore/devconsole
- **Name:** Living Checklist for ChatGPT & Claude (max 45 chars)
- **Category:** Productivity
- **Short description** (132 chars max): Turn ChatGPT and Claude replies into a living, interactive checklist. One-click merge keeps your progress when plans change.
- **Keywords to target:** chatgpt checklist, claude ai checklist, ai task manager, chatgpt extension productivity
