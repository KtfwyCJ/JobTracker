# Technical Question Forecast — Design Spec

**Date:** 2026-06-04

## Overview

When a job reaches the **Technical Interview** status, a "✦ Technical Questions" button appears in the job detail header. Clicking it opens a right-side drawer where the user pastes an interviewer's LinkedIn URL and generates the top 20 technical questions to prepare for the interview. Questions are derived from three sources: the interviewer's LinkedIn profile, the user's CV (`CV.md`), and the job description. Results are saved directly on the `Job` record.

---

## Data Model

Extend the `Job` interface in `app/_lib/types.ts` with two optional fields:

```ts
interviewerLinkedIn?: string    // LinkedIn URL entered by the user
technicalQuestions?: string[]   // 20 generated question strings
```

Add one new store action in `app/_lib/store.tsx`:

```ts
updateTechnicalQuestions(jobId: string, linkedinUrl: string, questions: string[]): void
```

This action writes both fields together atomically and persists via the existing `saveData` mechanism.

---

## API Route

**Path:** `POST /api/technical-questions/generate`

**Request body:**
```ts
{ linkedinUrl: string, jobDescription: string }
```

**Server logic:**
1. Read `CV.md` from project root — return 500 if missing (same pattern as `/api/cv/match`)
2. Attempt to fetch the LinkedIn URL server-side using a browser-like `User-Agent` header; extract visible text from the response HTML
3. If LinkedIn fetch fails (403, redirect to login page, or empty/meaningless body): set `linkedinFetched = false` and proceed without profile text
4. Call Claude (`claude-sonnet-4-6`) with a prompt combining CV + job description + LinkedIn text (if available), requesting exactly 20 technical questions as a JSON array of strings
5. Return `{ questions: string[], linkedinFetched: boolean }`

**Failure modes:**

| Condition | Response |
|---|---|
| `CV.md` missing | 500 `{ error: "CV.md not found in project root." }` |
| LinkedIn blocked | 200 with questions, `linkedinFetched: false` |
| Claude error | 500 `{ error: "Failed to generate questions: <message>" }` |

---

## UI Components

### `TechnicalQuestionsDrawer.tsx` (new)

A right-side drawer panel with three internal states:

**State 1 — Entry (no saved questions):**
- Text input for LinkedIn URL
- "Generate 20 Questions" button
- Helper note: "Questions are generated based on the interviewer's LinkedIn profile, your CV, and this job's description."

**State 2 — Loading:**
- Input shows entered URL (read-only)
- Button shows "Generating… ⟳" (disabled)
- Skeleton placeholder rows

**State 3 — Results:**
- Numbered list of 20 questions (scrollable)
- If `linkedinFetched === false`: amber warning banner — "⚠ LinkedIn profile couldn't be fetched. Questions are based on your CV and job description only."
- "Save to Job" button — calls `updateTechnicalQuestions` then closes drawer
- "↺ Regenerate" link — resets to State 1

**Already-saved shortcut:** If `job.technicalQuestions` is already populated when the drawer opens, go directly to State 3 (results view) showing the saved questions and `job.interviewerLinkedIn`.

### `JobDetail.tsx` (modified)

- Add a "✦ Technical Questions" button in the header action row (alongside Edit / Delete), visible only when `job.status === 'technical_interview'`
- Maintain a boolean `drawerOpen` state; render `<TechnicalQuestionsDrawer />` when true

---

## Claude Prompt

```
You are a technical interview coach. Given the information below, generate exactly 20 technical interview questions that the candidate should prepare for.

Return ONLY a valid JSON array of 20 strings — no markdown, no explanation.

INTERVIEWER LINKEDIN PROFILE:
{linkedinText | "Not available"}

JOB DESCRIPTION:
{jobDescription}

CV:
{cvContent (first 6000 chars)}

Focus on:
- Technologies and tools mentioned in the job description
- Areas the interviewer likely specialises in (based on their profile)
- Gaps between the CV and JD requirements
- System design, algorithms, or domain-specific depth appropriate for the role
```

---

## File Checklist

| File | Change |
|---|---|
| `app/_lib/types.ts` | Add `interviewerLinkedIn?` and `technicalQuestions?` to `Job` |
| `app/_lib/store.tsx` | Add `updateTechnicalQuestions` action |
| `app/_components/JobDetail.tsx` | Add button (conditional on status) + render drawer |
| `app/_components/TechnicalQuestionsDrawer.tsx` | New component |
| `app/api/technical-questions/generate/route.ts` | New API route |
