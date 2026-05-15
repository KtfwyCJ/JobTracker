# JD Analyze Pipeline — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Problem

Evaluating whether a job posting matches your profile requires manually reading the JD, comparing it to your CV, identifying gaps, estimating fit, and writing a tailored cover letter — all repetitive cognitive work. This feature automates the full pipeline.

---

## Scope

A new `/analyze` page with a 5-stage AI pipeline: URL → JD Extraction → JD Structuring → CV Matching → Gap Analysis → Cover Letter Generation. Standalone tool, no integration with the job tracker.

---

## Prerequisites (user setup)

1. **`CV.md`** — place in project root. Added to `.gitignore`.
2. **`.env.local`** — add `ANTHROPIC_API_KEY=sk-ant-...`.
3. **Install** `@anthropic-ai/sdk`.

---

## Architecture

### Pipeline stages

Five sequential Next.js App Router route handlers. The client calls them in order; each response becomes the next call's input.

```
Client
  │  POST /api/jd/extract       { url }
  │◄─────────────────────────── { text, wordCount }
  │  POST /api/jd/structure      { text }
  │◄─────────────────────────── { title, company, level, skills[], requirements[] }
  │  POST /api/cv/match          { jd: <structured>, cv: <CV.md text> }
  │◄─────────────────────────── { strengths[], gaps[], summary }
  │  POST /api/cv/gaps           { jd: <structured>, match: <match result> }
  │◄─────────────────────────── { hardGaps[], softGaps[], score, verdict }
  │  POST /api/cover-letter/generate  { jd, match, gaps }
  │◄─────────────────────────── { coverLetter }
```

### Stage 1 — JD Extractor (`/api/jd/extract`)

Fetches the job posting URL using the Jina Reader proxy (`https://r.jina.ai/<url>`), which returns clean readable markdown from any page including SPAs. No API key required. Returns `{ text: string, wordCount: number }`.

Error cases: non-200 from Jina → return `{ error: "Could not fetch URL" }`.

### Stage 2 — JD Structurer (`/api/jd/structure`)

Sends the raw text to Claude with a prompt asking for structured JSON:

```json
{
  "title": "Backend Engineer",
  "company": "Stripe",
  "level": "Senior",
  "location": "Remote",
  "skills": ["Go", "Postgres", "gRPC"],
  "requirements": ["5+ years backend", "distributed systems experience"],
  "niceToHave": ["Kafka", "Kubernetes"]
}
```

Claude model: `claude-sonnet-4-6`. Response parsed as JSON.

### Stage 3 — CV Matcher (`/api/cv/match`)

Reads `CV.md` from the filesystem (`process.cwd() + '/CV.md'`). Sends structured JD + full CV.md content to Claude. Prompt asks Claude to identify:
- `strengths`: skills/experience in the CV that match the JD
- `gaps`: requirements in the JD not clearly evidenced in the CV
- `summary`: 2–3 sentence narrative

### Stage 4 — Gap Analyzer (`/api/cv/gaps`)

Sends structured JD + match result to Claude. Returns:
- `hardGaps`: missing must-have requirements (array of strings)
- `softGaps`: missing nice-to-haves (array of strings)
- `score`: integer 1–10 (10 = perfect match)
- `verdict`: one-line judgment (e.g., "Strong match — worth applying", "Partial match — address gaps in cover letter", "Weak match — significant skill gaps")

Score rubric passed in the prompt:
- 9–10: nearly all requirements met
- 7–8: most requirements met, minor gaps
- 5–6: roughly half requirements met
- 3–4: significant gaps
- 1–2: major mismatch

### Stage 5 — Cover Letter Generator (`/api/cover-letter/generate`)

Sends structured JD + match strengths + gap analysis to Claude. Prompt asks for a professional, personalized 300–400 word cover letter that:
- Opens with a specific hook referencing the role/company
- Highlights the top 2–3 matching strengths with brief examples from CV
- Briefly addresses any hard gaps (frames them positively if possible)
- Closes with enthusiasm and a call to action

Returns `{ coverLetter: string }`.

---

## UI — `/analyze` page

Uses `DashboardShell` (same as all other pages). Full-width scrollable content area.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ JobTracker  [Companies][Board][Calendar][Waiting List][Analyze] │
├─────────────────────────────────────────────────────────────┤
│  Analyze a Job                                               │
│  Paste a job posting URL to extract, match, and generate    │
│  a cover letter.                                             │
│                                                              │
│  [https://jobs.lever.co/...               ] [Analyze]        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ JD Extractor      1,842 words from jobs.lever.co   │   │
│  │ ✓ JD Structurer     Backend Engineer · Go · Senior   │   │
│  │ ⟳ CV Matcher        Comparing your CV…               │   │
│  │ ○ Gap Analyzer                                       │   │
│  │ ○ Cover Letter Generator                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Match Score ──────────────────────────────────────┐    │
│  │   7.5 / 10   ████████░░  Good match — worth applying│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Cover Letter                               [Copy] [Copied!] │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dear Hiring Manager, I am writing to express…       │   │
│  │  (scrollable textarea, read-only)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Step row states

| State  | Icon | Background | Border |
|--------|------|------------|--------|
| Idle   | Numbered circle (gray) | white | zinc-100 |
| Active | Spinning blue circle | blue-50 | blue-200 |
| Done   | Green checkmark | green-50 | green-200 |
| Error  | Red ✕ | red-50 | red-200 |

### Score card

Shown after Gap Analyzer completes. Score is a float (e.g. 7.5). Progress bar fills proportionally. Verdict text color: green (≥7), amber (4–6), red (<4).

### Cover letter area

- `<textarea>` read-only, `rows={14}`, full width, monospace-ish font
- **Copy** button: copies `coverLetter` to clipboard; label changes to "Copied!" for 2 seconds then reverts
- Only rendered after Cover Letter Generator step completes

### Error state

If any route returns `{ error: string }`:
- Step icon changes to red ✕
- Error message shown below step name
- **Retry** button re-runs from that step forward (re-uses all previous results)

---

## Navbar update

Add `<Link href="/analyze">Analyze</Link>` after the "Waiting List" link in `app/_components/Navbar.tsx`.

---

## Files to Create / Modify

| File | Change |
|---|---|
| `CV.md` | User creates — personal CV in markdown |
| `.env.local` | User adds `ANTHROPIC_API_KEY` |
| `.gitignore` | Add `CV.md` and `.env.local` |
| `app/_components/Navbar.tsx` | Add "Analyze" nav link |
| `app/analyze/page.tsx` | New page — full pipeline UI |
| `app/api/jd/extract/route.ts` | Stage 1: Jina fetch |
| `app/api/jd/structure/route.ts` | Stage 2: Claude JD structuring |
| `app/api/cv/match/route.ts` | Stage 3: Claude CV matching (reads CV.md) |
| `app/api/cv/gaps/route.ts` | Stage 4: Claude gap analysis + score |
| `app/api/cover-letter/generate/route.ts` | Stage 5: Claude cover letter |

**Package to install:** `@anthropic-ai/sdk`

---

## Out of Scope

- Saving analysis results to the job tracker
- Multiple CV support
- History of past analyses
- Editing the structured JD before matching
- Manual override of the match score
- Support for PDF CVs (markdown only)
