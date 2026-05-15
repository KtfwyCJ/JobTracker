# Waiting List Feature — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Problem

There is no way to track job postings you intend to apply for but haven't applied to yet. These get lost in browser bookmarks or notes, with no connection to the tracker. Existing tracked jobs also lack a place to record the posting link, external requisition ID, and a personal match assessment.

---

## Scope

A dedicated "Waiting List" tab where users can record specific job postings (company + title) they plan to apply to. Entries can be promoted to real tracked jobs with a single click when the user actually applies.

Additionally, three new optional fields are added to **both** `WaitlistEntry` and `Job`:
- **Job Posting ID** — external requisition number from the company ATS (e.g. `REQ-84321`)
- **Job Link** — URL to the job posting
- **Match Level** — personal 1–5 star rating of how well the role matches the user

---

## Data Model

### New type: `WaitlistEntry` (`app/_lib/types.ts`)

```ts
export interface WaitlistEntry {
  id: string
  companyName: string
  jobTitle: string
  jobPostingId?: string   // external requisition ID, e.g. "REQ-84321"
  jobLink?: string        // URL to the posting
  matchLevel?: number     // 1–5 stars; undefined means unrated
  createdAt: string
}
```

### Updated type: `Job` (`app/_lib/types.ts`)

Three new optional fields added to the existing `Job` interface:
```ts
jobPostingId?: string
jobLink?: string
matchLevel?: number     // 1–5 stars; undefined means unrated
```

### `AppData` change

Add `waitlist: WaitlistEntry[]` to the `AppData` interface. Default to `[]` when loading from localStorage (backward-compatible with existing data).

---

## Store Actions (`app/_lib/store.tsx`)

### New actions for the waiting list

**`ADD_WAITLIST_ENTRY`** payload: `{ companyName, jobTitle, jobPostingId?, jobLink?, matchLevel? }`
- Creates a `WaitlistEntry` with a new uuid and current timestamp
- Appends to `state.waitlist`

**`DELETE_WAITLIST_ENTRY`** payload: `{ id: string }`
- Removes the entry with the matching id from `state.waitlist`

**`UPDATE_WAITLIST_MATCH`** payload: `{ id: string; matchLevel: number }`
- Updates `matchLevel` on a single waitlist entry in place
- Used for inline star edits on the Waiting List page

**`PROMOTE_WAITLIST_ENTRY`** payload: `{ id: string }`
- Atomically in one reducer step:
  1. Removes the entry from `state.waitlist`
  2. Finds or creates a `Company` by `companyName` (case-insensitive match, same logic as `ADD_JOB`)
  3. Creates a `Job` with `status: 'applied'`, `appliedAt` set to today's date (`YYYY-MM-DD`), and `jobPostingId`, `jobLink`, `matchLevel` carried over from the waitlist entry
  4. Creates a seed `TimelineEvent` with title `'Applied'` and `eventDate` set to today's date
- Result: entry gone from waiting list, job visible in Companies and Board views with all metadata preserved

### Updated actions for tracked jobs

**`ADD_JOB`** payload gains: `jobPostingId?`, `jobLink?`, `matchLevel?`

**`UPDATE_JOB`** payload gains: `jobPostingId?`, `jobLink?`, `matchLevel?`

**`UPDATE_JOB_MATCH`** payload: `{ jobId: string; matchLevel: number }` (new)
- Updates `matchLevel` on a single job in place
- Used for inline star edits in the Job Detail panel

### Context functions

New or updated helpers on the store context:
- `addWaitlistEntry(payload): void`
- `deleteWaitlistEntry(id): void`
- `updateWaitlistMatch(id, matchLevel): void`
- `promoteWaitlistEntry(id): void`
- `updateJobMatch(jobId, matchLevel): void`

---

## UI

### Navbar (`app/_components/Navbar.tsx`)

Add a "Waiting List" `<Link href="/waitlist">` after the "Calendar" link, using identical active-state styling as the other nav tabs.

### New page: `/waitlist` (`app/waitlist/page.tsx`)

Full-width layout (no split panel). Contains a single `WaitlistPage` client component.

```
┌──────────────────────────────────────────────────────────────────┐
│ JobTracker  [Companies] [Board] [Calendar] [Waiting List]        │
├──────────────────────────────────────────────────────────────────┤
│  Waiting List                                  [+ Add Entry]     │
│  ─────────────────────────────────────────────────────────────   │
│  Google  Senior SWE L5  REQ-84321  🔗  ★★★★☆  [I Applied] [✕]  │
│  Meta    Product Mgr    —          🔗  ★★★☆☆  [I Applied] [✕]  │
│  OpenAI  Researcher     JR-1042    —   ☆☆☆☆☆  [I Applied] [✕]  │
│                                                                  │
│  (empty state when list is empty)                                │
└──────────────────────────────────────────────────────────────────┘
```

Each row shows:
- Company name + job title (prominent)
- Posting ID (muted text; omitted if empty)
- Job link (clickable icon; omitted if empty)
- 5-star widget — clickable inline to set/change `matchLevel`
- "I Applied" button
- Delete button (shows inline "Remove? Confirm · Cancel" confirmation on click)

List is sorted by `createdAt` descending (newest at top).

### Add Entry modal (`app/_components/AddWaitlistEntryModal.tsx`)

A modal triggered by the "+ Add Entry" button. Fields:

| Field | Required | Type |
|---|---|---|
| Company Name | Yes | text |
| Job Title | Yes | text |
| Job Posting ID | No | text |
| Job Link | No | URL text input |
| Match Level | No | 5-star picker |

Submit calls `addWaitlistEntry(...)` and closes the modal.

### Empty state (Waiting List)

When `waitlist` is empty, show a centered message:
> "No entries yet. Add jobs you plan to apply to."

---

### Job Detail panel (`app/_components/JobDetail.tsx`)

Three new fields displayed in the job header area (below title/company/location row):

- **Job Link** — if set, shown as a small "View Posting →" anchor that opens in a new tab; if unset, hidden
- **Posting ID** — if set, shown as muted label text alongside the link; if unset, hidden
- **Match Level** — always shown as a 5-star widget. Clicking a star calls `updateJobMatch(job.id, n)` inline. If unrated, shows 5 empty stars.

These fields are editable via the existing Edit modal (see below).

### Add / Edit Job modal (`app/_components/AddJobModal.tsx`)

Three new optional fields added to the form (between existing fields and submit):

| Field | Required | Type |
|---|---|---|
| Job Posting ID | No | text |
| Job Link | No | URL text input |
| Match Level | No | 5-star picker |

Pre-filled from `job` when in edit mode. Passed through `addJob` / `updateJob` actions.

---

## 5-Star Widget

A small reusable component `StarRating` (`app/_components/StarRating.tsx`):
- Props: `value: number | undefined`, `onChange: (n: number) => void`, `readOnly?: boolean`
- Renders 5 stars; filled up to `value`, empty beyond
- Clicking star `n` calls `onChange(n)`
- Clicking an already-selected star (same `n`) clears the rating (`onChange(0)` → stored as `undefined`)
- `readOnly` mode: no hover/click, used for display-only contexts (e.g. future Board card)

---

## Files to Create / Modify

| File | Change |
|---|---|
| `app/_lib/types.ts` | Add `WaitlistEntry`; add 3 optional fields to `Job`; add `waitlist` to `AppData` |
| `app/_lib/storage.ts` | Default `waitlist: []` when loading legacy data |
| `app/_lib/store.tsx` | Add 4 waitlist actions + 2 job match actions; update `ADD_JOB` / `UPDATE_JOB` payloads; add context functions |
| `app/_components/Navbar.tsx` | Add "Waiting List" nav link |
| `app/_components/StarRating.tsx` | New — reusable 5-star widget |
| `app/_components/AddWaitlistEntryModal.tsx` | New — modal with all 5 fields |
| `app/_components/AddJobModal.tsx` | Add 3 new optional fields (posting ID, link, match level) |
| `app/_components/JobDetail.tsx` | Display job link, posting ID, and inline star rating in header |
| `app/waitlist/page.tsx` | New — page shell + list component with all row fields |

---

## Out of Scope

- Editing a waiting list entry in place (delete and re-add is sufficient)
- Sorting or filtering the waiting list
- Showing star ratings on Kanban cards
- Integration with the Calendar view
- Bulk operations
