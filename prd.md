# ChatGPT Checklist Exporter

## Product Summary
A Chrome extension that turns useful plans from ChatGPT into a simple Google Sheets checklist so the user can track progress outside the chat.

## Problem
ChatGPT creates useful plans, but they are hard to execute from inside the chat. Users lose progress, forget steps, and do not have a persistent checklist they can work from.

## Solution
A lightweight Chrome extension that reads the current ChatGPT conversation, extracts task lines from the latest assistant answer, and creates a Google Sheet checklist with basic tracking columns.

## Target User
A solo user who uses ChatGPT to plan work and wants a fast way to turn those plans into an actionable checklist.

## Main Use Case
1. User asks ChatGPT for a step-by-step plan.
2. User clicks the extension.
3. Extension exports the latest useful answer into a Google Sheet.
4. User checks items off in Google Sheets while working.

## MVP Goal
Create the smallest useful version that works reliably for personal use.

## MVP Features
- Test Google login
- Create empty checklist sheet
- Export latest ChatGPT assistant answer to a new Google Sheet
- Parse simple checklist lines:
  - bullets
  - numbered steps
- Write rows:
  - Task
  - Done
  - Notes
- Open the Sheet automatically

## Non-Goals
- No backend
- No database
- No team features
- No multi-thread sync
- No version history
- No update or merge into an existing sheet
- No Docs export
- No fancy UI

## Success Criteria
- User can go from ChatGPT answer to usable Google Sheet in under 10 seconds
- Export works reliably on chatgpt.com
- User personally uses it multiple times in one week

## Technical Constraints
- Chrome Extension Manifest V3
- Google OAuth via `chrome.identity`
- Google Sheets API only
- No server or backend
- All auth handled in extension
- Scope limited to spreadsheets
- Site limited to `chatgpt.com`

## Current Architecture
- Popup UI
- Background service worker
- Content script
- Google OAuth
- Google Sheets API calls from background
- Content extraction from current ChatGPT tab

## Current Buttons
- Test Google Login
- Create Empty Checklist Sheet
- Export Last Answer to Sheet

## Parsing Rules
For now, only parse lines that start with:
- `-`
- `*`
- `1.`
- `2.`
- `3.`

Keep parsing simple and reliable.

## Output Format
Create a new Google Sheet titled:

`ChatGPT Checklist`

Use these columns:
- Task
- Done
- Notes

## Next Priorities
1. Make export reliably pull the latest assistant answer
2. Improve task parsing
3. Add better errors
4. Later: update an existing sheet instead of always creating a new one

## Product Principle
This tool is not for storing chats.  
It is for turning AI plans into execution checklists quickly.

---

# Build Rules for Cursor
- Stay focused on the smallest useful version
- Do not add unnecessary features
- Do not introduce a backend unless explicitly requested
- Prefer the simplest working implementation
- Keep the extension focused on exporting useful task lists from ChatGPT
- Keep code readable and easy to debug
- Keep user-facing steps simple and easy to follow
- When giving instructions, always give step-by-step actions in plain English
- If testing is needed, explain exactly what to click, what to expect, and what success looks like
- If something breaks, explain the likely cause and the smallest fix first
- Do not drift into unrelated features

---

# Recursive Working Style
When working on this project:
1. Focus on one small task at a time
2. Implement only that task
3. Stop and report:
   - what changed
   - what files changed
   - what command to run
   - what to click to test
   - what success looks like
4. Then wait for the next instruction

If a task is too big, break it into smaller steps and do the first useful one.

---

# Execution Style
For every task:
- Give easy step-by-step instructions
- Keep explanations short
- Prefer practical actions over theory
- Optimize for speed, clarity, and usefulness
- Avoid fluff
- Avoid hallucinating features that do not exist
- Stay aligned with this file

---

# Current Main Task
Make `Export Last Answer to Sheet` work reliably on `chatgpt.com` and create a usable Google Sheet checklist from the latest assistant response.

## Definition of Done
- User opens a ChatGPT thread
- User clicks `Export Last Answer to Sheet`
- Extension reads the latest assistant answer
- Extension extracts simple task lines
- Extension creates a Google Sheet
- Extension writes:
  - Task
  - Done
  - Notes
- Extension opens the new sheet automatically
- Errors are readable and easy to debug

---

# How Cursor Should Respond
When asked to work on this project:
1. Read this file first
2. Stay within the MVP scope
3. Make the smallest useful change
4. Give short step-by-step testing instructions
5. Keep the project moving forward without overcomplicating it