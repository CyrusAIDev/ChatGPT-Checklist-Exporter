# Living Checklist — Product Requirements Document
> **Scope lock:** Ship free tier + Stripe premium gate + Chrome Web Store SEO. Nothing else.

---

## Launch checklist (update checkboxes as tasks complete)

```
Free tier submission ████████████████████░░░░  80%
Premium (Stripe) gate ░░░░░░░░░░░░░░░░░░░░░░░░   0%
Chrome Web Store SEO  ████████░░░░░░░░░░░░░░░░  33%
```

- [x] Version → 1.0.0
- [x] Privacy policy at `docs/privacy.html`
- [x] AI Organizer bug fixed (JSON truncation, 8192 tokens)
- [x] Smart merge works on un-grouped lists
- [x] Loading spinners on Organize + Merge
- [x] Reliable Refresh page (removed broken Check again)
- [x] Apple-look UI, solid smart-merge toggle contrast
- [ ] **Task A — GitHub Pages:** Enable in repo Settings → Pages → branch: main / folder: /docs. Privacy URL: `https://cyrusaidev.github.io/ChatGPT-Checklist-Exporter/privacy.html`
- [ ] **Task B — Chrome Web Store SEO:** Fill listing at https://chrome.google.com/webstore/devconsole
- [ ] **Task C — Submit zip:** `cd .output && zip -r living-checklist.zip chrome-mv3/` → upload to Web Store
- [ ] **Task D — Stripe premium gate:** See spec below
- [ ] **Task E — Post-launch:** Screenshots, promo tile, keyword A/B test

---

## Task A — GitHub Pages (15 min, no code)
1. Go to https://github.com/CyrusAIDev/ChatGPT-Checklist-Exporter/settings/pages
2. Source: Deploy from a branch
3. Branch: `main` / Folder: `/docs` → Save
4. Privacy policy URL: `https://cyrusaidev.github.io/ChatGPT-Checklist-Exporter/privacy.html`
5. Paste that URL into the Chrome Web Store listing

---

## Task B — Chrome Web Store SEO
**Listing URL:** https://chrome.google.com/webstore/devconsole
| Field | Value |
|-------|-------|
| Name (45 char max) | Living Checklist for ChatGPT & Claude |
| Category | Productivity |
| Short desc (132 char max) | Turn ChatGPT and Claude replies into a living, interactive checklist. One-click merge keeps your progress when plans change. |
| Primary keyword | chatgpt checklist |
| Secondary keywords | claude ai checklist, ai task manager, chatgpt extension productivity |

**Long description structure:**
1. Hook (1 sentence) — what it does
2. Core features (4 bullets)
3. How it works (3 steps)
4. Who it's for (2 sentences)
5. Privacy note (1 sentence + link)

---

## Task C — Zip and submit
```bash
cd /Users/cyrusghoreishi/Desktop/chrome-ext-starter
pnpm build
cp -r .output/chrome-mv3/ extension/
cd .output && zip -r living-checklist.zip chrome-mv3/
```
Upload `living-checklist.zip` at https://chrome.google.com/webstore/devconsole.
One-time $5 developer fee required if not paid.

---

## Task D — Stripe premium gate (estimated 2–3 hrs)
### What exists
- Auth gate already in `App.tsx`: every premium feature checks `!authUser`
- Need to change to `!isPro` where `isPro = authUser && profile?.is_pro`

### Steps
1. **Stripe account** → get `STRIPE_SECRET_KEY` (sk_live_...) and `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
2. **Supabase secrets:**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref hnzowqseruvxypyutwcc
   supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_... --project-ref hnzowqseruvxypyutwcc
   ```
3. **Supabase DB migration:**
   ```sql
   ALTER TABLE profiles ADD COLUMN is_pro BOOLEAN DEFAULT false;
   ```
4. **App.tsx changes:**
   - Add `const [isPro, setIsPro] = useState(false)`
   - Fetch `profiles` row on sign-in, set `isPro = profile.is_pro`
   - Replace all `!authUser` premium gates with `!isPro`
5. **Edge function `stripe-webhook`:**
   - Verify Stripe signature
   - On `checkout.session.completed` → set `profiles.is_pro = true` for user
6. **Checkout flow in extension:**
   - Add "Upgrade to Pro" button → opens Stripe Checkout in new tab
   - After payment, webhook fires, `is_pro` flips, user sees Pro features on next session

### Premium features to gate (search `!authUser` in App.tsx)
- AI Organizer button
- Smart merge toggle
- Cloud sync / Library across devices

### Pricing
- One-time $9.99 OR $4.99/month (decide before implementing checkout)

---

## Out of scope (do not implement)
- Drag-to-reorder items
- Sharing checklists with other users
- Any AI feature beyond the current Organizer
- Mobile / Firefox / Safari support
- Analytics / telemetry

---

## Known issues (low priority, do not fix unless blocking launch)
- 🪄 emoji may render as ✏️ on some Windows fonts
- Inline editing only works in grouped mode (after Organize)
- No drag-to-reorder
