# Waiting List Feature — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Problem

There is no way to track job postings you intend to apply for but haven't applied to yet. These get lost in browser bookmarks or notes, with no connection to the tracker.

---

## Scope

A dedicated "Waiting List" tab where users can record specific job postings (company + title) they plan to apply to. Entries can be promoted to real tracked jobs with a single click when the user actually applies.

---

## Data Model

### New type: `WaitlistEntry` (`app/_lib/types.ts`)

```ts
export interface WaitlistEntry {
  id: string
  companyName: string
  jobTitle: string
  createdAt: string
}
```

### `AppData` change

Add `waitlist: WaitlistEntry[]` to the `AppData` interface. Default to `[]` when loading from localStorage (backward-compatible with existing data).

---

## Store Actions (`app/_lib/store.tsx`)

Three new actions added to the reducer:

**`ADD_WAITLIST_ENTRY`** payload: `{ companyName: string; jobTitle: string }`
- Creates a `WaitlistEntry` with a new uuid and current timestamp
- Appends to `state.waitlist`

**`DELETE_WAITLIST_ENTRY`** payload: `{ id: string }`
- Removes the entry with the matching id from `state.waitlist`

**`PROMOTE_WAITLIST_ENTRY`** payload: `{ id: string }`
- Atomically in one reducer step:
  1. Removes the entry from `state.waitlist`
  2. Finds or creates a `Company` by `companyName` (case-insensitive match, same logic as `ADD_JOB`)
  3. Creates a `Job` with `status: 'applied'` and `appliedAt` set to today's date
  4. Creates a seed `TimelineEvent` with title `'Applied'` and `eventDate` set to today's date
- Result: entry gone from waiting list, job visible in Companies and Board views

All three actions are exposed as helper functions on the store context:
- `addWaitlistEntry(companyName: string, jobTitle: string): void`
- `deleteWaitlistEntry(id: string): void`
- `promoteWaitlistEntry(id: string): void`

---

## UI

### Navbar (`app/_components/Navbar.tsx`)

Add a "Waiting List" `<Link href="/waitlist">` after the "Calendar" link, using identical active-state styling as the other nav tabs.

### New page: `/waitlist` (`app/waitlist/page.tsx`)

Full-width layout (no split panel). Contains a single `WaitlistPage` client component.

```
┌──────────────────────────────────────────────────────────────┐
│ JobTracker  [Companies] [Board] [Calendar] [Waiting List]    │
├──────────────────────────────────────────────────────────────┤
│  Waiting List                              [+ Add Entry]     │
│  ─────────────────────────────────────────────────────────   │
│  Google         Senior SWE L5      [I Applied]  [Delete]     │
│  Meta           Product Manager    [I Applied]  [Delete]     │
│  OpenAI         Research Scientist [I Applied]  [Delete]     │
│                                                              │
│  (empty state when list is empty)                            │
└──────────────────────────────────────────────────────────────┘
```

List is sorted by `createdAt` descending (newest at top).

### Add Entry modal (`app/_components/AddWaitlistEntryModal.tsx`)

A small modal triggered by the "+ Add Entry" button. Two required text fields:
- **Company Name** — plain text input
- **Job Title** — plain text input

Submit calls `addWaitlistEntry(companyName, jobTitle)` and closes the modal.

### Row actions

**"I Applied" button** — calls `promoteWaitlistEntry(entry.id)`. No confirmation needed (the action is recoverable — the promoted job can be deleted via the normal delete-job flow).

**"Delete" button** — shows an inline confirmation replacing the two buttons:
> "Remove? **Confirm** · Cancel"

Confirm calls `deleteWaitlistEntry(entry.id)`. Cancel reverts. Confirmation state is local to the row component (`useState`). This mirrors the existing delete-job confirmation pattern in `JobDetail`.

### Empty state

When `waitlist` is empty, show a centered message:
> "No entries yet. Add jobs you plan to apply to."

---

## Files to Create / Modify

| File | Change |
|---|---|
| `app/_lib/types.ts` | Add `WaitlistEntry` interface; add `waitlist` field to `AppData` |
| `app/_lib/storage.ts` | Default `waitlist: []` when loading legacy data |
| `app/_lib/store.tsx` | Add 3 actions + reducer cases + 3 context functions |
| `app/_components/Navbar.tsx` | Add "Waiting List" nav link |
| `app/_components/AddWaitlistEntryModal.tsx` | New — modal with company + title fields |
| `app/waitlist/page.tsx` | New — page shell + list component |

---

## Out of Scope

- Extra fields (URL, deadline, priority, notes) — not needed for initial version
- Editing a waiting list entry (delete and re-add is sufficient)
- Sorting or filtering the waiting list
- Integration with the Calendar view
- Bulk operations
