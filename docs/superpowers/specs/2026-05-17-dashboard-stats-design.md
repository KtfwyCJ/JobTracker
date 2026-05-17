# Dashboard Stats Panel & Sidebar Filter — Design Spec

Date: 2026-05-17

## Overview

Two improvements to the dashboard:
1. A **Stats Overview Panel** replaces the "Select a job to view details" empty state in the right panel. It shows key application metrics and three Recharts charts.
2. **Status filter chips** in the sidebar allow quick filtering of the job list by status, reducing clutter when many jobs are present.

## Dependencies

Install Recharts:
```
npm install recharts
```

---

## Feature 1: Stats Overview Panel

### Placement

`JobDetail.tsx` currently renders an empty div with "Select a job to view details" when `selectedJobId` is null. Replace that with `<StatsPanel />`.

### New component: `app/_components/StatsPanel.tsx`

Pure client component. Reads from `useStore()`. No props needed.

#### Layout

```
┌─────────────────────────────────────────┐
│  Overview                               │
│  "Your job search at a glance"          │
│                                         │
│  [Companies] [Total Jobs] [★★★★★] [Active]  ← stat cards
│                                         │
│  Application Activity (last 8 weeks)    │  ← BarChart
│                                         │
│  Status Breakdown                       │  ← horizontal BarChart
│                                         │
│  Top Companies                          │  ← horizontal BarChart
└─────────────────────────────────────────┘
```

#### Stat cards (4 cards in a grid)

| Card | Value | Color accent |
|---|---|---|
| Companies | `data.companies.length` | `text-blue-600` |
| Total Jobs | `data.jobs.length` | `text-zinc-900` |
| 5-Star Rated | `data.jobs.filter(j => j.matchLevel === 5).length` | `text-amber-500` |
| Active | `data.jobs.filter(j => j.status !== 'rejected' && j.status !== 'accepted').length` | `text-green-600` |

Card style: `rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm`, large bold number + small label.

#### Application Activity chart

- **Type:** Recharts `<BarChart>` (vertical bars)
- **Data:** Last 8 calendar weeks. For each week, count jobs where `appliedAt` falls in that week. Week key is the Monday start date formatted as "MMM d".
- **X axis:** week label. **Y axis:** count (integer).
- **Bar fill:** `#3b82f6` (blue-500), `radius={[4,4,0,0]}`
- Container: `<ResponsiveContainer width="100%" height={160}>`
- Chart style: no axis lines/tick lines, subtle tooltip with `borderRadius: 8`

#### Status Breakdown chart

- **Type:** Recharts `<BarChart layout="vertical">` (horizontal bars)
- **Data:** All 7 statuses in pipeline order. For each: `{ label, status, count }` where count may be 0.
- **Bar fill:** Per-status color using `STATUS_COLORS` mapping (extract the Tailwind hex equivalents as constants in StatsPanel — do not depend on Tailwind class strings in Recharts):
  ```ts
  const STATUS_HEX: Record<JobStatus, string> = {
    applied: '#3b82f6',
    phone_screen: '#a855f7',
    technical_interview: '#06b6d4',
    onsite: '#f97316',
    offer: '#f59e0b',
    accepted: '#22c55e',
    rejected: '#ef4444',
  }
  ```
- Use `<Cell>` per bar to apply per-status color.
- Y axis width: 90px (fits "Technical Interview" label).
- Container height: 220px.

#### Top Companies chart

- **Type:** Recharts `<BarChart layout="vertical">`
- **Data:** All companies sorted by job count descending, top 5 only.
- **Bar fill:** `#8b5cf6` (violet-500), `radius={[0,4,4,0]}`
- Y axis width: 80px.
- Container height: 160px (or `5 * 32` based on entry count).
- If fewer than 2 companies exist, hide this section entirely (not enough data to be useful).

#### Empty state

If `data.jobs.length === 0`, show a simple centered message: "No applications yet — click + Add Job to get started." instead of the charts.

---

## Feature 2: Sidebar Status Filter Chips

### Placement

`JobList.tsx` — a new row of chips inserted between the search input and the company list, separated by `border-b border-zinc-100`.

### State

```ts
const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')
```

Local to `JobList` — no store changes needed.

### Chip labels (abbreviated to fit)

```
All · Applied · Phone · Tech · Onsite · Offer · Accepted · Rejected
```

### Behavior

- Clicking an inactive chip sets `filterStatus` to that status.
- Clicking the already-active chip resets to `'all'` (toggle off).
- When `filterStatus !== 'all'`:
  - Job cards are filtered to only show jobs matching `job.status === filterStatus`
  - Companies whose jobs are all filtered out are hidden entirely (no empty company header shown)
- The existing search filter (`q`) composes with the status filter: both must pass.

### Chip styles

```
Active:   rounded-full bg-zinc-900 text-white px-2.5 py-0.5 text-[11px] font-semibold
Inactive: rounded-full bg-zinc-100 text-zinc-500 px-2.5 py-0.5 text-[11px] font-semibold hover:bg-zinc-200
```

Chips wrap to a second line if needed (`flex flex-wrap gap-1.5`).

---

## Files Modified

| File | Change |
|---|---|
| `app/_components/StatsPanel.tsx` | New component |
| `app/_components/JobDetail.tsx` | Import + render `<StatsPanel />` instead of empty div |
| `app/_components/JobList.tsx` | Add `filterStatus` state + chip row + filter logic |
| `package.json` | Add `recharts` dependency |

## Constraints

- `StatsPanel` is client-only (`'use client'`). No server data fetching.
- All data computed client-side from `useStore()` — no new store actions or selectors needed.
- Do not use Tailwind class strings as Recharts fill values — use the hex constants defined in `StatsPanel`.
- Recharts components must be wrapped in `ResponsiveContainer` for correct sizing in the flex layout.
