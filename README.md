# Career Dashboard

A personal job application tracker with AI-assisted features, built with Next.js 16 and the Anthropic API.

## Features

- **Dashboard** — overview stats: active applications, upcoming interviews, offer rate, and response rate
- **Job List** — track applications through the full hiring pipeline (Applied → Phone Screen → Technical → Onsite → Offer → Accepted/Rejected), with star ratings and match scores
- **Kanban Board** — drag-and-drop view of all applications by status
- **Calendar** — week/month view of scheduled interviews
- **Waitlist** — save jobs you're interested in before applying
- **Explore** — search live job listings via LinkedIn and Arbeitnow APIs and add them directly to your tracker
- **Analyze** — AI-powered CV analysis: match score, gap detection, and improvement suggestions per job
- **Cover Letter Generator** — AI-generated cover letters based on your CV and the job description, with PDF export

All data is stored locally in the browser (localStorage) — no backend or database required.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4
- **Drag & Drop:** dnd-kit
- **Charts:** Recharts
- **AI:** Anthropic API (`claude-sonnet-4-6`)
- **PDF export:** jsPDF + html2canvas

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) (required for AI features)

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

Edit `.env.local` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Add your CV and cover letter template

The AI features read two files from the project root. These are personal and not included in the repo — copy the examples and fill them in:

```bash
cp CV.example.md CV.md
cp CoverLetterTemplate.example.md CoverLetterTemplate.md
```

- **`CV.md`** — your CV in Markdown. Used for match scoring, gap analysis, and improvement suggestions.
- **`CoverLetterTemplate.md`** — your base cover letter. The AI uses this as a starting point when generating cover letters for specific jobs.

Both files are in `.gitignore` and will never be committed.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes (AI features) | Anthropic API key for CV analysis and cover letter generation |

AI features (Analyze page, Cover Letter) will not work without this key. All other features work without it.

## Project Structure

```
app/
├── dashboard/       # Stats overview
├── board/           # Kanban view
├── calendar/        # Interview calendar
├── waitlist/        # Pre-application job list
├── explore/         # Job search
├── analyze/         # AI CV analysis
├── api/
│   ├── cv/          # Match, gap, and suggestions endpoints
│   ├── cover-letter/# Cover letter generation
│   ├── explore/     # Job listing search proxy
│   └── jd/          # Job description structuring
├── _components/     # Shared UI components
└── _lib/            # Types, store, and localStorage layer
```

## License

MIT
