# Letterly

**Tailored cover letters in 30 seconds.** Letterly is a single-page web app that turns your resume and a job posting into a specific, honest cover letter — one that maps your real experience to what the posting asks for and never invents employers, degrees, or metrics.

## What it does

Letterly walks you through three steps:

1. **Resume** — Upload a PDF, DOCX, or TXT resume (or paste the text). Parsing happens entirely in your browser; the text is saved to your browser's local storage so you can come back without re-uploading.
2. **Job posting** — Paste the posting text, or upload screenshots of it. You can optionally add the company name, job title, and anything specific you want mentioned ("mention my open-source work").
3. **Your letter** — The AI drafts a letter on paper-style writing surface. From there you can:
   - Switch **tone** (Professional, Warm & Conversational, Confident & Bold, Concise & Direct), **length** (~150 / ~250–300 / ~400 words), and **focus** (Balanced, Skills, Achievements, Career change), then regenerate.
   - **Apply feedback** — describe what to change ("make the opening less generic") and get a revised draft.
   - Keep and compare **multiple versions** (v1, v2, …) and switch between them.
   - Edit the letter inline (it's a plain editable textarea), copy it, or export as **.docx** or **PDF** with a dated header built from your resume's name and contact lines.

**History** — every letter session (one job posting plus all its drafts) is saved automatically in a left sidebar, grouped by Today / Yesterday / Previous 7 days / Older. Search by title, company, or letter text; click an entry to reopen it with all versions; rename, duplicate, or delete entries from the "…" menu; or start fresh with **New letter**. On phones the sidebar opens as a drawer.

When a requirement in the posting isn't backed by your resume, the app flags it in a **Notes** box under the letter instead of fabricating a claim.

## Privacy

- Your resume and letters are **never stored on the server**. There's no database — nothing to leak.
- Resume parsing, screenshot compression, and .docx/PDF export all run in your browser via libraries loaded on demand.
- The resume text, job posting, and screenshots are sent only to the letter-generation endpoint for the duration of one request, purely to write the letter.
- Two things persist in your browser only: the resume text (local storage) and your letter history (IndexedDB) — letters, Notes, job posting text, and your "mention this" notes, but **never screenshots**. History is never sent to a server except as part of the one-request generation flow above.
- The "Clear my data" button on step 1 wipes both the resume and all letter history; "Clear all history" in the sidebar wipes history only. History is capped at 100 entries (oldest dropped first).

## Honesty guarantees

The letter generator runs under a strict system prompt:

- Use **only** facts present in the resume — never invent employers, degrees, skills, metrics, or dates.
- Map the 3–4 most important job requirements to the strongest matching evidence; if the resume can't support a requirement, say so in the notes rather than claim it.
- No "I am writing to apply…" openers, no clichés ("team player", "passionate", "dynamic").
- Plain text output with the greeting first — no dates or address headers to delete.

Prompt-injection resistant: the resume, job posting, and screenshots are treated strictly as data, never as instructions.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, file-based routing) |
| Build | Vite 8, deploys to edge functions |
| Styling | Tailwind CSS v4 + shadcn/ui components |
| AI | Lovable AI Gateway (OpenAI Responses API, structured output via Zod) |
| Client-side parsing | `pdfjs-dist` (PDF), `mammoth` (DOCX), canvas compression for screenshots |
| Export | `docx` (.docx), `jspdf` (PDF) |
| Tests | Vitest + Testing Library |
| Error monitoring | Lovable error reporting |

## Project structure

```
src/
├── routes/
│   ├── index.tsx              # Landing page + step-1 hero
│   ├── api/generate.ts        # POST /api/generate — letter generation server route
│   └── __root.tsx             # App shell, fonts, 404/error boundaries
├── components/letterly/
│   ├── Wizard.tsx             # Page layout, step state, session + auto-save to history
│   ├── HistorySidebar.tsx     # History list, search, grouping, row actions
│   ├── useHistory.ts          # Hook: loads history, exposes mutations
│   ├── ResumeStep.tsx         # Upload/paste resume
│   ├── JobStep.tsx            # Posting text, screenshots, company/title/extra
│   ├── LetterStep.tsx         # Generation, versions, editing, export
│   └── Dropzone.tsx           # Shared file dropzone
├── lib/
│   ├── letter-prompt.ts       # Prompt builder + option catalogs (shared client/server)
│   ├── letter.server.ts       # Server-only: AI call, rate limiting, error mapping
│   ├── files.ts               # Browser-only: parsing, image compression, exports
│   └── history.ts             # Browser-only: IndexedDB letter history + pure helpers
├── start.ts                   # Server middleware (error page, CSRF for server functions)
└── styles.css                 # Tailwind v4 theme + design tokens
```

## How generation works

1. The browser POSTs a JSON request to `/api/generate` with the resume text, job text and/or screenshots (as data URLs), optional company/title/extra, and the chosen tone/length/focus.
2. The server route builds a prompt (resume and posting wrapped in fenced blocks, user notes marked as instructions-from-the-user), validates and clamps the input (max 5 screenshots, 20k characters each), and calls the Lovable AI Gateway with a structured-output schema: `{ letter, detected_company, detected_title, notes }`.
3. If the user didn't type a company or title, the ones detected from the posting are auto-filled back into the form.
4. The JSON response returns to the browser; nothing is persisted anywhere.

**Rate limiting:** each IP may generate up to 20 letters per hour (best-effort, per worker instance). Exceeding it returns a friendly 429.

**Error handling:** upstream failures are mapped to human-readable messages — "AI is busy" (429), "AI credits have run out" (402), "The AI declined this request" (403), plus a clear "Try again" card in the UI when a draft fails.

## Getting started

Prerequisites: Node.js (v20+ recommended) and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Open http://localhost:8080. The app runs without extra setup when built through Lovable, where the `LOVABLE_API_KEY` for the AI gateway is provisioned automatically. If you self-host outside Lovable, set `LOVABLE_API_KEY` in the server environment — generation returns a 500 with "AI is not configured." without it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |

## Testing

The project ships with Vitest (jsdom + Testing Library). Run `npm run test` — the suite covers app routing, history logic (date grouping, search, 100-entry cap, rename/duplicate/delete), and the history sidebar. Test files live in `src/test/`.

## Notes for developers

- **Server/browser boundaries matter.** `src/lib/letter.server.ts` runs only server-side; `src/lib/files.ts` is browser-only and must always be imported dynamically so it never loads during SSR. File parsing and export must stay client-side.
- The AI model and gateway base URL are constants at the top of `letter.server.ts`.
- `routeTree.gen.ts` is generated by the router plugin — never edit it by hand.
- Resume text is clamped to 20,000 characters and screenshots to 5 per request before being sent to the model.
