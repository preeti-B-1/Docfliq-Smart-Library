# DocFliq Smart Library

An AI-powered medical content library. Admins upload articles, case studies, and clinical guidelines — Claude automatically tags them by specialty, topic, and difficulty. Readers discover content through hybrid search, smart filters, bookmarks, reading history, and an Ask AI chat panel.

---

## Architecture

```
Next.js (Vercel) ──REST + JWT──▶ FastAPI (Render) ──▶ Supabase (PostgreSQL + pgvector)
                                       │
                                       ├──▶ Claude Sonnet 4.6  (tagging, summaries, Ask AI)
                                       ├──▶ GPT-4o             (fallback if Claude fails)
                                       └──▶ OpenAI API         (text-embedding-3-small for search)
```

Frontend owns authentication (NextAuth.js issues JWTs). FastAPI validates every incoming JWT — no shared session state. Supabase is used as a plain PostgreSQL host with pgvector; no Supabase Auth. Original uploaded files are discarded after text extraction — extracted HTML and plain text are stored in PostgreSQL. All Claude/GPT calls are logged to `ai_provider_logs` for monitoring.

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui | Vercel |
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2 (async) + Alembic | Render |
| Database | PostgreSQL + pgvector | Supabase |
| Auth | NextAuth.js (Credentials + Google OAuth) → JWT | Vercel |
| AI (primary) | Claude Sonnet 4.6 — tagging, summaries, Ask AI | Anthropic |
| AI (fallback) | GPT-4o — automatic fallback if Claude fails | OpenAI |
| Embeddings | text-embedding-3-small — hybrid search vectors | OpenAI |
| Rich Text | TipTap WYSIWYG | Bundled |
| Charts | Recharts | Bundled |

---

## Features

**Content & Upload**
- File upload (PDF, DOCX, 25MB max) or TipTap rich text editor with image support
- Bulk upload — drag-drop up to 10 files, per-file status tracking
- AI auto-tagging: specialty (fixed 25-item list), topics, difficulty, key terms, content type, 3-line summary
- GPT-4o fallback if Claude fails; all AI calls logged with duration and fallback flag
- Draft → Publish workflow with admin review and inline editing
- Startup recovery — stuck "processing" records are automatically re-queued

**Discovery**
- Hybrid search — 50% keyword (PostgreSQL tsvector) + 50% semantic (pgvector cosine distance)
- PubMed-style sidebar filters — Specialty + Difficulty, AND logic
- Personalized content sorting — feed ordered by cosine similarity to user's reading history embeddings (if 3+ reads)
- Related content — up to 4 recommendations per article via tag overlap count

**Reader Features**
- Bookmarks — save/unsave; My Bookmarks page
- Reading history — list with last-read timestamps
- Ask AI — SSE-streamed Q&A scoped to a single article, 10-message session limit, Claude + GPT-4o fallback

**Admin**
- Drafts page — review AI tags, edit content, publish/unpublish/delete
- Analytics dashboard — Views, Specialties, Search Terms, Signups, Publishing activity, AI Provider Stats

---

## Project Structure

```
docfliq-smart-library/
│
├── frontend/src/
│   ├── app/           # All pages — auth, library, article detail, bookmarks, history, upload, drafts, analytics
│   ├── components/    # shadcn/ui primitives, layout (navbar/footer), article cards + search + filters, admin forms + charts
│   ├── lib/           # API client, NextAuth config, utility functions
│   ├── hooks/         # Custom hooks for auth, content fetching, debounce
│   ├── types/         # All TypeScript interfaces
│   ├── config/        # App-wide constants (specialties, limits, pagination)
│   └── middleware.ts  # Route protection and auth redirects
│
└── backend/app/
    ├── core/          # App config, database connection, JWT/password security
    ├── models/        # Database tables (ORM)
    ├── schemas/       # Request/response validation (Pydantic)
    ├── api/           # Route handlers for auth, content, bookmarks, history, analytics, images, Ask AI
    ├── services/      # Business logic — AI tagging + fallback, content + search, analytics queries
    └── utils/         # PDF/DOCX text extraction, specialty list validation
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase project with pgvector enabled (`CREATE EXTENSION vector;`)
- Anthropic API key
- OpenAI API key
- Google OAuth credentials (optional)

### Frontend

```bash
cd frontend
npm install
cp frontend.env.example .env.local
# Fill in .env.local
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp backend.env.example .env
# Fill in .env
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
```

**Backend** (`.env`):
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=              # Must match NEXTAUTH_SECRET
ADMIN_EMAIL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ALLOWED_DOMAINS=gmail.com,docfliq.com
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Constraints

- Supabase: 500MB DB | Render: free tier (cron ping every 14 min) | Vercel: 100GB bandwidth
- File uploads: PDF and DOCX only, 25MB max, 10 files max (bulk)
- No OCR: scanned PDFs unsupported — use the rich text editor instead
- Single admin: controlled via `ADMIN_EMAIL` env var
- No mobile: desktop only for MVP
- Ask AI: 10-message limit per session, session-only (not persisted)
- Specialty list: fixed at 25 options — adding new ones requires a code change
