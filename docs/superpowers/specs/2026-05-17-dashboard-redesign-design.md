# Dashboard UI Redesign — Design Spec

Date: 2026-05-17

## Overview

Surface-polish redesign of the dashboard page (JobList + JobDetail components). The layout structure (two-panel, Navbar on top) stays intact. The goal is a Modern & Structured feel (Linear/Notion style) — cleaner visual hierarchy, color-accented status, and friendlier interactions — without changing any logic or data flow.

## Scope

Files changed:
- `app/_components/JobList.tsx` — sidebar redesign
- `app/_components/JobDetail.tsx` — detail panel redesign
- `app/_components/Timeline.tsx` — minor body tweaks

No changes to: `DashboardShell`, `Navbar`, `StarRating`, `AddJobModal`, `store`, `types`.

---

## Section 1: Left Sidebar — JobList

### Company header row
- Replace the `▶ / ▼` text characters with a proper SVG chevron icon that rotates 90° when expanded (CSS `transition-transform`)
- Add a small colored initial avatar: a 20×20px circle using the company's existing theme `bg` + `text` colors, containing the first letter of the company name in uppercase. Sits left of the company name.

### Job cards
- Add a colored left-edge status dot using `STATUS_DOT_COLORS` — a 6px wide vertical bar on the left side of each card (via `border-l-[3px]` with the status color), replacing the current flat left border. Status is now visible at a glance without reading the badge text.
- Keep the status badge but reduce it to lighter weight: `text-[9px]` with less prominent border, so the dot communicates status and the badge is secondary confirmation.
- **Selected state**: change from `border-indigo-300 bg-indigo-50/40` to `bg-zinc-900 text-white shadow-md` — strong, unambiguous selection. Job title text flips to `text-white`, date and stars adjust to lighter variants (`text-zinc-300`, amber stars remain).
- Search input: change `rounded-lg` → `rounded-xl`, increase vertical padding to `py-2` for a taller hit target.

---

## Section 2: Job Detail Panel — Header

The header is split into two distinct zones separated by a `border-b border-zinc-100`:

### Zone 1 — Identity (top)
- Company name: `text-sm text-zinc-400` (unchanged)
- Job title: `text-xl font-semibold text-zinc-900` (unchanged)
- Meta row: single line — `📍 location · Applied date · View Posting →` — condensed with `·` separators
- Second meta line: `★★★☆☆ · DE · #JOB123` — match stars + German badge + posting ID on one row, replacing the separate stacked items

### Zone 2 — Actions (bottom of header)
- **Status pills**: replace the `<select>` dropdown with a horizontal scrollable row of pill buttons, one per status. The active status pill is `bg-zinc-900 text-white`. Inactive pills are `border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50`. Clicking an inactive pill calls `updateJobStatus` immediately — no submit needed.
- All 7 statuses shown in a wrapping flex row (they fit comfortably in the wide panel at small text size `text-xs`).
- **Edit / Delete**: moved to the top-right corner of the header as small text buttons (`text-xs font-medium`), always visible. Delete still uses the existing two-step confirm pattern (inline "Delete this job? Confirm · Cancel"), but positioned in the top-right.
- The `Requires German` checkbox is removed from the header and moved into a dedicated metadata section in the body (below description/analysis), so the header stays clean.

---

## Section 3: Detail Body — Description, Analysis, Timeline

### Description & Analysis sections
- Replace `▲ Hide / ▼ Show` text buttons with a `›` chevron SVG that rotates 90° when open — same pattern as the sidebar company toggle.
- **Analysis block**: change from a full-border `border border-zinc-100` box to a left-accent style: `border-l-2 border-zinc-300 bg-zinc-50 pl-3` — reads as a blockquote, less boxy.

### Requires German (relocated)
- Moved from the header into a simple metadata row in the body, above Description: `Requires German  [toggle]` — a small labeled row, unobtrusive.

### Timeline
- Date label moves to the **left** of the event title as a fixed-width leading column (`w-16 shrink-0 text-xs text-zinc-400`), giving a log/ledger feel rather than inline metadata.
- Vertical connector line (`border-l border-zinc-200`) and dot styling unchanged.
- Hover-reveal Edit/Delete actions unchanged.
- Add Event form inputs: change `rounded-lg` → `rounded-xl` for consistency with sidebar search.

---

## Interaction Summary

| Interaction | Before | After |
|---|---|---|
| Change job status | `<select>` dropdown | Pill button row, single click |
| Collapse company | `▶▼` text toggle | Rotating chevron SVG |
| Collapse description/analysis | `▲▼ Hide/Show` text | Rotating chevron SVG |
| Select a job | Subtle indigo highlight | Strong `bg-zinc-900` fill |
| Edit / Delete | Buttons below status select | Top-right corner of header |
| View German requirement | Checkbox in header | Metadata row in body |
