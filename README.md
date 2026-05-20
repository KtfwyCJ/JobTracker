# Career Dashboard

A personal job application tracker with AI-assisted features, built with Next.js 16 and the Anthropic API.

## Features

- **Dashboard** — overview stats: active applications, upcoming interviews, offer rate, and response rate
- **Job List** — track applications through the full hiring pipeline (Applied → Phone Screen → Technical → Onsite → Offer → Accepted/Rejected), with star ratings and match scores
- **Kanban Board** — drag-and-drop view of all applications by status
- **Calendar** — week/month view of scheduled interviews; click any event to edit or delete it inline
- **Waiting List** — save jobs you're interested in before applying; promote to active tracker with one click
- **Explore** — search live job listings via LinkedIn and Arbeitnow APIs and add them directly to your tracker
- **Analyze** — AI-powered CV analysis: match score, gap detection, and improvement suggestions per job
- **Cover Letter Generator** — AI-generated cover letters based on your CV and the job description, with PDF export
- **Learn** — track learning resources (books, repos, articles, projects) with status and daily journal (what I did / plan for tomorrow)
- **Tips** — interview prep entries per company/position: notes, interview questions (text or link), learning sources, prep checklist, and a full markdown guide panel for detailed prep documents

All data is stored locally in the browser (localStorage) with an optional file-based backup at `data/data.json`. No external database required.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4
- **Markdown:** react-markdown + remark-gfm + @tailwindcss/typography
- **Drag & Drop:** dnd-kit
- **Charts:** Recharts
- **AI:** Anthropic API (`claude-sonnet-4-6`)
- **PDF export:** jsPDF + html2canvas

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) (required for AI features only)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.local.example .env.local
```

Edit `.env.local` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Add your CV and cover letter template

The AI features read two files from the project root. These are personal and not committed to the repo — copy the examples and fill them in:

```bash
cp CV.example.md CV.md
cp CoverLetterTemplate.example.md CoverLetterTemplate.md
```

- **`CV.md`** — your CV in Markdown. Used for match scoring, gap analysis, and improvement suggestions.
- **`CoverLetterTemplate.md`** — your base cover letter. The AI uses this as a starting point when generating cover letters for specific jobs.

Both files are in `.gitignore` and will never be committed.

### Run

```bash
# Development (with Turbopack)
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI features only | Anthropic API key for CV analysis and cover letter generation |

The Analyze page and Cover Letter generator require this key. All other features (job tracking, calendar, learn, tips, etc.) work without it.

## Data Persistence

Data is saved to `localStorage` immediately on every change. A debounced backup also writes to `data/data.json` via the `/api/data` PUT endpoint — this file survives browser clears and can be committed to keep data across machines.

## Project Structure

```
app/
├── dashboard/       # Stats overview + job list
├── board/           # Kanban view
├── calendar/        # Interview calendar (week/month)
├── waitlist/        # Pre-application job list
├── explore/         # Live job search
├── analyze/         # AI CV analysis
├── learn/           # Learning resource tracker + daily journal
├── tips/            # Interview prep entries with markdown guide
├── api/
│   ├── cv/          # Match, gap, and suggestions endpoints
│   ├── cover-letter/# Cover letter generation
│   ├── data/        # File-based data backup (GET/PUT)
│   ├── explore/     # Job listing search proxy
│   └── jd/          # Job description structuring
├── _components/     # Shared UI components
└── _lib/            # Types, store (useReducer + Context), and localStorage layer
```

## License

MIT
