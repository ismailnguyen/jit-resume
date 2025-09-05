# Just-in-Time Résumé (JIT Resume)

Generate a tailored, ATS-friendly résumé for any job in seconds. Privacy‑first and browser‑based: your data stays on your device; the app calls OpenAI only when you generate AI outputs (tailored resume, fit analysis, coaching).

## Features

- Tailored résumé generation (Markdown → print‑ready PDF)
- ATS keyword analysis with weighted score (synonym‑aware; tunable weights)
- HR‑style Fit Score with strengths/gaps/seniority
- Gap coaching (bullet‑level suggestions to close JD gaps, generated automatically on creation)
- Smart reorder of bullets by JD relevance (applied automatically on generation)
- Side‑by‑side editor + live preview (desktop)
- PDF themes with visual previews (Modern/Classic/Compact/LaTeX)
- Import JD from URL or PDF/Text (transparent CORS fallback)
- Tags + filters in library
- Cost controls with token‑based estimate and per‑generation cap
- First‑run guide and helpful score explanations

## Quick Start

Prerequisites
- Node.js 18+ and npm

Setup
```sh
npm i
npm run dev
```
Open http://localhost:5173

In the app:
1) Settings → paste your OpenAI API key and pick a model.
2) Personal Details → add your canonical Markdown résumé.
3) New Resume → paste/import a job description, choose language, Generate.

## Usage Overview

- Target Language:
  - Auto: detect language from the job description.
  - Default: uses your default language from Settings.
  - Or pick English/French/German/Spanish.
- Themes: pick via preview cards in Settings; PDF export applies theme‑specific CSS.
- Import:
  - URL: app tries direct fetch; if blocked by CORS it transparently uses a readability proxy and notifies you it may take longer.
  - File: upload .pdf or .txt (PDF extraction is best‑effort; review text).
- Scores:
  - ATS score shows coverage of top JD keywords found in your résumé, weighted by section (Skills > Experience > Summary > Other). Weights are adjustable in Settings.
  - Fit score estimates recruiter‑screen likelihood via LLM; re‑score anytime.
- Coaching: bullet‑level suggestions are generated on creation. Copy and integrate.
- Smart Reorder: reorders bullet blocks by JD relevance (synonym‑aware).
- Tags & Filters: add tags to resumes, filter by search and tags in Library.

## Cost Controls

Settings → Cost Controls let you:
- Enable estimates and a per‑generation cap.
- Configure $/1k tokens for input/output.
- Show a confirm dialog with the estimated cost before generating.
- Cancel if estimate exceeds your cap.

Estimates use rough tokenization (chars/4) of JD + personal details for input and a bounded output size.

## Data & Privacy

- Storage: IndexedDB (via `idb`) + Zustand store; all data lives in your browser.
- Network: Calls OpenAI’s API for generation, fit scoring, and coaching. URL import may use a readability proxy if the site blocks CORS.

## Tech Stack

- Vite, React, TypeScript
- Tailwind CSS, shadcn/ui, lucide-react
- Markdown editor: `@uiw/react-md-editor`, rendering via `marked`
- State: Zustand; Storage: IndexedDB (`idb`)

## Key Files

- `src/pages/NewResume.tsx` — JD import, language selection, generation, cost checks
- `src/pages/ResumeDetail.tsx` — editor/preview, ATS/Fit, coaching, PDF export
- `src/lib/analysis.ts` — keyword extraction, section‑weighted ATS scoring, smart reorder
- `src/pages/ResumeLibrary.tsx` — list, tags, filters
- `src/pages/Settings.tsx` — API config, themes, cost controls, ATS weights
- `src/lib/openai.ts` — OpenAI calls (generate, fit assess, gap coaching)
- `src/lib/analysis.ts` — keyword extraction, section‑weighted ATS scoring
- `src/lib/storage.ts` — IndexedDB schema (resumes + personal details)
- `src/lib/store.ts` — app settings, index, and UI state (Zustand)

## PDF Export

Click “PDF” in the resume detail page to open the print dialog and save as PDF. The selected theme controls fonts, spacing, and headings.

## Development

```sh
npm i
npm run dev
```

The app uses Vite and React; no server is required. Adjust styles in Tailwind and theme CSS in the print function inside `src/pages/ResumeDetail.tsx`.

## Notes & Limitations

- URL import depends on site policies; a readability proxy is used when CORS blocks direct fetches.
- PDF text extraction is best‑effort. Some PDFs require manual copy/paste.
- ATS score is a heuristic for keyword alignment; it is not a guarantee of actual ATS outcomes.
