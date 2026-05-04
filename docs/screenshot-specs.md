# Chrome Web Store Screenshot Specs

All screenshots: 1280 × 800 px, PNG, sRGB colour space.
Chrome side panel is open on the right side of the browser window in all shots.
Use a clean Chrome window with no other extensions visible in the toolbar.

---

## Screenshot 1 — Before / After (Hero)

**Purpose:** Show the core value prop in a single frame.

**Layout:** Split screen, 640 px each side, thin divider line in the centre.

**Left side — ChatGPT conversation:**
- URL bar shows chatgpt.com/c/…
- A ChatGPT assistant message is visible, containing a numbered 7-step plan in plain prose (e.g. a product launch plan). The message should look natural and slightly long — the kind of thing you would not want to re-copy.
- No checklist panel open.

**Right side — Living Checklist side panel:**
- Same conversation, side panel open.
- Shows the same 7 steps as a clean interactive checklist with checkboxes.
- 2 items are checked (with strikethrough and green inset accent).
- Progress bar visible at top: "2 / 7 steps done", bar ~28% filled.
- Header eyebrow reads "For ChatGPT" in green.

**Text overlay (bottom centre):** "From messy reply to living checklist — in one click."

---

## Screenshot 2 — Progress Bar in Action

**Purpose:** Show the progress tracking feature.

**Scene:** Side panel open on a ChatGPT conversation.

**Content:**
- Header: "For ChatGPT" in green eyebrow, "Living checklist" title.
- Progress bar at top of checklist: "4 / 7 steps done", bar ~57% filled in green (#10A37F).
- 4 checked items visible (strikethrough text, green left accent shadow on each row).
- 3 unchecked items visible below.
- Action bar visible at bottom with "Merge latest" button and Export / Share buttons.

**Text overlay (top left corner of side panel):** "Your progress, always visible."

---

## Screenshot 3 — Merge in Action

**Purpose:** Demonstrate the unique merge algorithm — the core differentiator.

**Layout:** Three-panel horizontal sequence within the 1280 × 800 frame, each ~390 px wide, labelled with a step number badge.

**Panel 1 — "Original plan":**
- Side panel showing a 5-step checklist.
- Steps 1 and 2 are checked.
- Label badge: "① Original — 2 steps done"

**Panel 2 — "Plan revised in ChatGPT":**
- ChatGPT conversation showing a revised message with 7 steps (the original 5 plus 2 new ones inserted in the middle and at the end).
- Label badge: "② Plan revised"

**Panel 3 — "After Merge":**
- Side panel showing the merged 7-step checklist.
- Steps 1 and 2 are still checked (preserved).
- Steps 3–7 are unchecked.
- A small merge summary strip visible: "+2 added · 0 archived"
- Label badge: "③ Merged — checked items preserved"

**Text overlay (top centre):** "Checked items survive every revision."

---

## Screenshot 4 — Share URL Flow

**Purpose:** Show the share and import feature.

**Layout:** Two-part scene within one frame.

**Top half:**
- Side panel open, showing a 6-step checklist titled "SaaS Launch Plan".
- The Share button in the action bar is highlighted (subtle ring or arrow callout).
- A "Link copied!" tooltip is visible above the Share button.

**Bottom half (slightly overlapping the browser area):**
- A second Chrome window / incognito window in the background, showing chatgpt.com with a "Shared plan imported" green info banner at the top of the side panel.
- The same 6-step checklist is now visible in the second window.

**Text overlay (centre):** "Share any plan as a URL. Anyone with the extension can import it."

---

## Screenshot 5 — Claude.ai Integration

**Purpose:** Show multi-AI support and the purple Claude accent.

**Scene:** Side panel open on a claude.ai conversation.

**Content:**
- Browser URL bar clearly shows claude.ai/chat/…
- A Claude assistant message is visible in the main window — a bulleted action plan (not numbered, to show the extension handles both formats).
- Side panel is open.
- Header eyebrow reads "For Claude" in purple (#7C3AED).
- A 5-item unordered checklist is shown with 1 item checked.
- Progress bar: "1 / 5 steps done", bar 20% filled in green.

**Text overlay (bottom of side panel):** "Works with Claude too."

---

## Production Notes

- Use a Retina / 2x display and export at exactly 1280 × 800 logical pixels (not 2560 × 1600).
- Side panel width: approximately 340 px inside the Chrome window.
- Avoid showing personal data, real email addresses, or real conversation content.
- Use a neutral system font in the browser chrome (San Francisco on Mac, Segoe UI on Windows).
- The extension's green accent (#10A37F) should be visible and recognisable across all shots.
- Screenshots 1–4 should use a light Chrome theme. Screenshot 5 can use light or dark.
