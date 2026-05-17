# CV Suggestions Feature — Design Spec

Date: 2026-05-17

## Overview

When the Gap Analyzer identifies gaps between the user's CV and a job description, the user can request ready-to-paste CV bullet rewrites that address each gap. This is an on-demand action triggered from the Analyze page, below the "Gaps to address" panel.

## API: `/api/cv/suggestions`

**Route:** `POST /api/cv/suggestions`

**Input:**
```json
{ "jd": <structured JD object>, "gaps": <gaps result object> }
```

**Behavior:**
1. Reads `CV.md` from the project root (same as `/api/cv/match`). Returns a 500 with a clear error message if the file is missing.
2. Calls Claude with a prompt that lists each hard gap and soft gap from the gaps result, provides the full CV text, and instructs it to produce one ready-to-paste bullet rewrite per gap.

**Response shape:**
```json
{
  "suggestions": [
    {
      "gap": "missing distributed systems experience",
      "bullet": "Designed and operated a distributed Go service handling 10k+ concurrent requests using gRPC and Kafka."
    }
  ]
}
```

One suggestion object per gap (hard gaps first, then soft gaps). The bullet should be a concrete, realistic rewrite grounded in the existing CV content — not invented experience.

**Error response:**
```json
{ "error": "Failed to generate suggestions: <reason>" }
```

## UI: Analyze Page

### New state fields

| Field | Type | Purpose |
|---|---|---|
| `suggestionsResult` | `{ gap: string; bullet: string }[] \| null` | API response |
| `suggestionsLoading` | `boolean` | Disables button, shows spinner label |
| `suggestionsCopied` | `boolean` | Drives copy-flash on "Copy all" button |

### New type

```ts
interface SuggestionsResult { suggestions: { gap: string; bullet: string }[] }
```

### Placement

The suggestions section is rendered immediately after the gaps panel (inside the `gapsResult?.score !== undefined` block), before the "Mark as Applied" button.

**Visibility condition:** shown only when `(gapsResult.hardGaps?.length ?? 0) + (gapsResult.softGaps?.length ?? 0) > 0` and the pipeline is not running.

### Layout

```
┌──────────────────────────────────────────────────┐
│ Gaps to address                                  │
│  ● missing distributed systems experience        │
│  ● no Kubernetes mentioned                       │
│                                                  │
│  [Get CV Suggestions]                            │
└──────────────────────────────────────────────────┘

         ↓ after clicking, loading resolved

┌──────────────────────────────────────────────────┐
│ CV Suggestions                      [Copy all]   │
│                                                  │
│  Gap: missing distributed systems experience     │
│  → Designed and operated a distributed Go        │
│    service handling 10k+ concurrent requests…    │
│                                                  │
│  Gap: no Kubernetes mentioned                    │
│  → Deployed containerised services to a          │
│    Kubernetes cluster using Helm charts…         │
└──────────────────────────────────────────────────┘
```

**Button states:**
- Default: "Get CV Suggestions"
- Loading: "Generating…" (disabled)
- After load: button hidden; panel with "Copy all" shown instead

**Error state:** if the API call fails, show an inline error message below the button with a "Retry" link that re-triggers the same call.

### "Copy all" behavior

Formats all suggestions as plain text and writes to clipboard:

```
Gap: missing distributed systems experience
→ Designed and operated a distributed Go service...

Gap: no Kubernetes mentioned
→ Deployed containerised services to a Kubernetes cluster...
```

`suggestionsCopied` flips to `true` for 2 seconds (same pattern as cover letter copy).

## Files to Create/Modify

| File | Change |
|---|---|
| `app/api/cv/suggestions/route.ts` | New API route |
| `app/analyze/page.tsx` | Add state, handler, and UI section |

## Constraints

- No new pipeline step — this is purely on-demand.
- Bullets must be grounded in the user's existing CV content; the prompt must instruct Claude not to invent experience.
- Follow the same API pattern (Anthropic SDK, JSON-only response, strip markdown fences) as existing routes.
