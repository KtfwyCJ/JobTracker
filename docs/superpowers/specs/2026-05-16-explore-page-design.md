# Explore Page — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

---

## Overview

A new **Explore** page (`/explore`) that lets the user search live job listings across multiple platforms by specifying keywords, location, and optionally a company name. Results are displayed in a scrollable list; each result can be saved to the Waiting List or marked as Applied directly.

---

## Page Structure & Navigation

- Route: `/explore`
- Added as a new nav link in `Navbar.tsx` between Analyze and the end of the nav list
- Wrapped in `DashboardShell` (same as all other pages) so the navbar and layout are consistent

---

## Layout

Left sidebar (fixed 220 px wide) + scrollable results panel (flex-1), side by side inside a full-height container. The sidebar has a light background (`bg-zinc-50`) with a right border. The results panel scrolls independently.

---

## Sidebar — Filter Controls

Four filter sections stacked vertically with an Explore button pinned to the bottom.

### Platforms
A set of checkboxes, one per supported platform. Initial set:
- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter

All checked by default. At least one must remain checked (validate before search).

### Keywords
A chip-style multi-tag input:
- The user types a keyword and presses **Enter** to add it as a chip.
- Each chip has an **×** button to remove it.
- The input field stays visible inline after existing chips.
- At least one keyword is required to search (Explore button disabled otherwise).

### Location
A plain text input. Example: `Berlin, Germany`. Required — Explore button disabled if empty.

### Company *(optional)*
A plain text input with placeholder `e.g. Google, Spotify…`. When filled, the search is narrowed to that employer. Leave blank to search all companies. A small "optional" label appears next to the section heading.

### Explore Button
- Full-width, dark (`bg-zinc-900`), pinned to the bottom of the sidebar via `margin-top: auto`.
- Disabled while a search is in-flight (shows "Searching…").
- Disabled if no keywords, no location, or no platforms selected.

---

## Results Panel

### Header row
Shows result count and active filter summary: e.g. `"12 results · LinkedIn, Indeed"` or `"4 results · Google · LinkedIn, Indeed"` when a company is specified.

### Job result rows
Each row is a rounded card (`bg-white`, subtle border and shadow). Contains:

| Element | Detail |
|---|---|
| **Title** | Job title, semibold |
| **Platform badge** | Color-coded pill: blue = LinkedIn, green = Indeed, yellow = Glassdoor, purple = ZipRecruiter |
| **Subline** | `Company · Location · Employment type` |
| **Posted date** | Relative (e.g. "2 days ago") |
| **+ Waitlist button** | Light outlined button — adds directly to Waiting List, no modal |
| **Mark Applied button** | Dark filled button — opens existing `AddJobModal` pre-filled |

**Row click behavior:** Clicking anywhere on the row _except_ the two action buttons opens the job's URL in a new tab (`window.open(url, '_blank')`).

### Empty / loading states
- **Loading:** Sidebar Explore button shows "Searching…", results panel shows a skeleton shimmer (3–4 placeholder rows).
- **No results:** A centered message: _"No jobs found. Try different keywords or broaden your location."_
- **Error:** A red error notice with the error message from the API.

---

## API Route — `/api/explore/search`

**Method:** POST  
**Purpose:** Server-side proxy to JSearch (RapidAPI). Keeps the API key out of the browser.

### Request body
```ts
{
  keywords: string[]    // e.g. ["Software Engineer", "AI Engineer"]
  location: string      // e.g. "Berlin, Germany"
  platforms: string[]   // e.g. ["linkedin", "indeed"]
  company?: string      // optional employer filter
}
```

### Processing
1. Join keywords into a single query string (e.g. `"Software Engineer OR AI Engineer"`).
2. If `company` is provided, prepend it: `"Google Software Engineer OR AI Engineer"`.
3. Call JSearch `/search` endpoint with `query`, `location`, and `employment_types=FULLTIME` (sensible default).
4. Filter results client-side by platform if JSearch doesn't support multi-platform filtering natively.
5. Map JSearch response fields to the internal `ExploreResult` shape.

### Response body
```ts
{
  results: ExploreResult[]
}

interface ExploreResult {
  id: string
  title: string
  company: string
  location: string
  employmentType: string
  postedAt: string       // relative string from JSearch
  url: string            // direct link to job posting
  platform: string       // "linkedin" | "indeed" | "glassdoor" | "ziprecruiter"
}
```

### Error response
```ts
{ error: string }
```

Returns HTTP 400 for missing/invalid input, 502 if the upstream JSearch call fails.

### Environment variable
`JSEARCH_API_KEY` — set in `.env.local`, accessed server-side only.

---

## Saving Jobs

### + Waitlist
Calls the existing `addWaitlistEntry` store action directly in the client. Maps `ExploreResult` fields to `WaitlistEntry`:
- `companyName` ← `result.company`
- `jobTitle` ← `result.title`
- `jobLink` ← `result.url`

No modal — instant save. Button text changes to "Saved ✓" for 2 seconds after save.

### Mark Applied
Opens the existing `AddJobModal` with `prefill` props:
- `companyName` ← `result.company`
- `title` ← `result.title`
- `location` ← `result.location`
- `jobLink` ← `result.url`

Identical pattern to the Analyze page's "Mark as Applied" flow.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/explore/page.tsx` | New — Explore page component |
| `app/api/explore/search/route.ts` | New — JSearch proxy API route |
| `app/_components/Navbar.tsx` | Modify — add Explore nav link |

---

## Out of Scope

- Pagination / load-more (first page of results only for now)
- Saving search preferences between sessions
- Deduplication across platforms
- Salary filtering
