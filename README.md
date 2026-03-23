# DocFliq Smart Library

An AI-powered medical content library. Admins upload articles, case studies, and clinical guidelines — Claude automatically tags them by specialty, topic, and difficulty. Readers discover content through hybrid search, smart filters, bookmarks, and reading history.

---

## Architecture

```
Next.js (Vercel) ──REST + JWT──▶ FastAPI (Render) ──▶ Supabase (PostgreSQL + pgvector)
                                       │
                                       ├──▶ Claude API  (tagging, summaries, Ask AI)
                                       └──▶ OpenAI API  (text embeddings for search)
```

Frontend owns authentication (NextAuth.js issues JWTs). FastAPI validates every incoming JWT — no shared session state. Supabase is used as a plain PostgreSQL host with the pgvector extension; no Supabase Auth. Original uploaded files are discarded after text extraction — only the extracted HTML is persisted.

---

## Tech Stack

**Frontend — Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui**
App Router's route groups (`(auth)`, `(dashboard)`, `(admin)`) cleanly separate layout concerns without extra wrappers. shadcn/ui gives fully customizable components that are styled via Tailwind classes — no fighting CSS specificity from a third-party library.

**Backend — Python 3.11 + FastAPI + SQLAlchemy 2 (async) + Alembic**
Chosen over Node.js because the AI/document processing ecosystem (Anthropic SDK, OpenAI SDK, PyMuPDF, Mammoth) is significantly stronger in Python. FastAPI's `BackgroundTasks` handles non-blocking AI processing without needing a separate job queue.

**Database — PostgreSQL via Supabase (+ pgvector)**
Relational schema is a natural fit for content–tags (many-to-many), users, and bookmarks. Supabase provides a free managed PostgreSQL instance with pgvector pre-available — adding semantic search without a separate vector database service.

**Auth — NextAuth.js (Credentials + Google OAuth) → JWT validated by FastAPI**
Handles the full auth flow on the frontend. FastAPI validates the same JWT independently using a shared secret — no Supabase Auth, no Auth0, no extra service to manage.

**AI — Claude API (tagging + Ask AI) + OpenAI API (embeddings)**
Claude reliably follows structured JSON prompts, which is critical for enforcing the fixed specialty list and tag format. OpenAI `text-embedding-3-small` is used for embeddings only — best price-to-quality ratio at this scale, far cheaper than running a self-hosted model.

**Deployment — Vercel (frontend) + Render (backend)**
Zero-config Next.js deployment on Vercel. Render hosts the FastAPI Docker container on the free tier; a cron ping every 14 minutes (via cron-job.org) prevents cold starts.

---

## Features

### Week 1 — Implemented
- Email/password and Google OAuth registration, domain-restricted via `ALLOWED_DOMAINS` env var
- Single admin account controlled by `ADMIN_EMAIL` env var
- File upload (PDF, DOCX up to 25MB) or rich text editor (TipTap WYSIWYG)
- AI auto-tagging via Claude: specialty (fixed 25-item list), topics, difficulty, key terms, content type, 3-line summary
- Hybrid search — 50% keyword (PostgreSQL tsvector) + 50% semantic (pgvector + OpenAI embeddings)
- Draft → Publish workflow with admin review and inline tag editing
- Content library with PubMed-style sidebar filters (Specialty + Difficulty, AND logic)
- Article detail page with full HTML rendering and admin edit mode
- Tag management: merge duplicates, rename, delete freeform tags

### Week 2 — In Progress
- Related content recommendations (tag overlap, top 5)
- Bulk upload (drag-drop, up to 10 files, per-file progress tracking)
- Reader bookmarks (save/unsave, My Bookmarks page)
- Reading history (list with last-read timestamps)
- Analytics dashboard (most viewed, popular tags, search terms, signups — Recharts)
- Ask AI chat panel (single-article Q&A, 10-message session limit)

---

## Project Structure

```
docfliq-smart-library/
├── frontend/          # Next.js 14 App Router
│   └── src/
│       ├── app/       # Pages: (auth)/, (dashboard)/, (admin)/, article/[id]/
│       ├── components/ # content/, auth/, admin/, ui/ (shadcn)
│       ├── lib/       # api-client.ts, auth.ts, utils.ts
│       ├── hooks/     # useAuth, useContent, useDebounce, useBookmarks
│       ├── types/     # index.ts — all TypeScript interfaces
│       └── config/    # constants.ts — specialties, difficulty levels, limits
│
└── backend/           # FastAPI + SQLAlchemy
    └── app/
        ├── api/       # routes/ (auth, content, tags) + deps/ (auth, database)
        ├── models/    # SQLAlchemy ORM models
        ├── schemas/   # Pydantic request/response schemas
        ├── services/  # ai_service, content_service, tag_service
        └── utils/     # text_extractor, specialties
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Supabase project with pgvector enabled (`CREATE EXTENSION vector;`)
- Anthropic API key
- OpenAI API key
- Google OAuth credentials (optional — for Google sign-in)

### Frontend

```bash
cd frontend
npm install
cp ../frontend.env.example .env.local
# Fill in .env.local values
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../backend.env.example .env
# Fill in .env values
alembic upgrade head
uvicorn app.main:app --reload
```

### Environment Variables

**Frontend** (`.env.local`):
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=
```

**Backend** (`.env`):
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=           # Must match NEXTAUTH_SECRET
ADMIN_EMAIL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ALLOWED_DOMAINS=gmail.com,docfliq.com
ALLOWED_ORIGINS=http://localhost:3000
```

---

## AI Tagging

On upload, extracted content is sent to Claude via a FastAPI `BackgroundTask`. Claude returns structured JSON:

| Tag Type | Format | Card | Sidebar Filter |
|----------|--------|------|----------------|
| Specialty | Fixed — 1-2 from 25 options | Blue chip | Yes |
| Topics | Freeform — 3-4 per article | Gray chip | No |
| Difficulty | Fixed — Beginner / Intermediate / Advanced | Color-coded chip | Yes |
| Key Terms | Freeform — 5-10 per article | No | No |
| Content Type | Inferred (Article, Case Study, Guideline…) | Detail page only | No |
| Summary | 3-sentence AI summary | Card text | No |

Article cards show exactly 4 chips: specialty (1-2) + difficulty (1) + top topics (fill to 4). An OpenAI embedding is generated in the same background task and stored for semantic search.

---

## Constraints

- **Supabase:** 500MB database limit
- **Render:** Free tier — kept awake via external cron ping every 14 minutes
- **File uploads:** PDF and DOCX only, 25MB max
- **No OCR:** Scanned PDFs unsupported — admin must use the rich text editor
- **Single admin:** Controlled via `ADMIN_EMAIL` env var
- **No mobile:** Desktop only for MVP
- **Ask AI:** 10-message limit per session, session-only (lost on reload)
- **Specialty list:** Fixed at 25 options — adding new ones requires a code change
