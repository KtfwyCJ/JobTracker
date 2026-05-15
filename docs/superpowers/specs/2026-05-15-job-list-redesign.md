# Job List Redesign — Floating Cards

**Date:** 2026-05-15
**Status:** Approved

---

## Problem

The left-side job list panel looks cluttered and visually inconsistent. Company header rows use loud pastel backgrounds, and job rows are plain flat buttons with no visual separation, making it hard to scan at a glance.

---

## Scope

Restyle `app/_components/JobList.tsx` only. No behavior changes — collapse/expand, selection, and search filtering remain identical. No other components are touched.

---

## Design

### Company Header Row

Replace the current pastel-background button with a plain white row that has a **colored left border** (3px solid, using the existing `companyTheme()` palette). Layout:

```
│ ▌ Google                          2  ▼
```

- Background: `bg-white` (no more colored background)
- Left border: `border-l-[3px]` in the company's theme border color
- Company name: `text-xs font-bold text-zinc-700`
- Job count: `text-[10px] text-zinc-400`
- Chevron: `text-[10px] text-zinc-400`

### Job Cards

Each job becomes a small rounded card with a visible border and a subtle shadow:

```
┌─────────────────────────────────────────┐
│ Senior SWE L5              [Applied]    │
│ Apr 5                         ★★★★☆    │
└─────────────────────────────────────────┘
```

States:

| State    | Classes                                              |
|----------|------------------------------------------------------|
| Default  | `border border-zinc-200 bg-white shadow-sm`          |
| Hover    | `border-zinc-300 shadow-md`                          |
| Selected | `border-indigo-300 bg-indigo-50/40`                  |

Card layout:
- **Margin**: `mx-2 mb-1.5` (8px horizontal, 6px bottom gap between cards)
- **Padding**: `p-2.5` inside the card
- **Top row**: job title (`text-[11.5px] font-semibold text-zinc-900 flex-1`) + optional "DE" badge + status badge (right-aligned)
- **Bottom row**: applied date (`text-[10px] text-zinc-400 flex-1`) + `<StarRating readOnly />` (right-aligned, only rendered when `matchLevel` is set)

Badge styles are unchanged — reuse `STATUS_COLORS` and `STATUS_LABELS` from `types.ts`.

---

## Files Modified

| File | Change |
|---|---|
| `app/_components/JobList.tsx` | Restyle company header rows and job button items |

No new files. No data or behavior changes.

---

## Out of Scope

- Changing panel width
- Changing search bar styling
- Changing collapse/expand or selection behavior
- Any other view (Board, Calendar, Waitlist)
