# Digital Growth Studio — Phase 0: Project Foundation

## Overview

Build the complete project foundation for **Digital Growth Studio — AI Ads Optimizer**, a SaaS platform that connects to Meta Ads accounts for read-only analytics and AI-powered recommendations.

This plan covers **Phase 0 only** — setting up the repository structure, both frontend and backend projects, database connection, Firebase config scaffolding, environment management, and the base UI shell.

> [!IMPORTANT]
> This is a phased build. We will NOT build everything at once. Phase 0 establishes the foundation, and each subsequent phase will have its own plan and approval cycle.

## Architecture Summary

```
USER → Next.js App → Firebase Auth → FastAPI → PostgreSQL (Supabase)
                                        ↓
                                    Meta API (Phase 4)
                                        ↓
                                    AI/ML (Phase 8)
```

## Technology Stack (Locked)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Authentication | Firebase Auth |
| Backend | FastAPI + Python |
| Database | Supabase PostgreSQL only |
| ORM | SQLAlchemy + asyncpg |
| Background Jobs | Celery + Redis |
| Meta | Marketing API — read-only |
| AI | LLM API + rule engine |
| Payments | Razorpay |

---

## User Review Required

> [!IMPORTANT]
> **Supabase Credentials Needed**: To connect the backend to Supabase PostgreSQL, I'll need your Supabase project URL and database connection string. I'll set up `.env.example` files with placeholder keys — you'll fill in real values.

> [!IMPORTANT]
> **Firebase Project**: I see you have a Firebase project `digital-growth-studio` (Project ID: `digital-growth-studio`, Project Number: `455814773569`). I'll configure the frontend and backend to use this project. You'll need to:
> 1. Enable Email/Password and Google sign-in methods in Firebase Console
> 2. Download the Firebase Admin SDK service account JSON for the backend
> 3. Get the Firebase web config object for the frontend

> [!WARNING]
> **Tailwind CSS Version**: The spec requests Tailwind CSS. I'll use **Tailwind CSS v3** (stable, well-supported by shadcn/ui). Tailwind v4 has breaking changes with shadcn/ui. Confirm if you want v3.

## Open Questions

1. **Supabase Region**: Which Supabase region is your project in? (This affects the database connection string)
2. **Domain**: Do you have a domain planned for deployment, or will we use localhost for now?
3. **Node.js Version**: What Node.js version do you have installed? (Minimum 18.x required for Next.js 14)
4. **Python Version**: What Python version do you have? (Minimum 3.10 required for FastAPI with modern features)

---

## Proposed Changes

### Monorepo Structure

The project will be organized as a monorepo with clear separation:

```
D:\App\Digital Growth Studio\
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── (auth)/          # Auth pages (login, signup, etc.)
│   │   │   ├── (dashboard)/     # Protected dashboard pages
│   │   │   │   ├── overview/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── ad-sets/
│   │   │   │   ├── ads/
│   │   │   │   ├── creatives/
│   │   │   │   ├── audiences/
│   │   │   │   ├── placements/
│   │   │   │   ├── demographics/
│   │   │   │   ├── recommendations/
│   │   │   │   ├── insights/
│   │   │   │   ├── creative-analyzer/
│   │   │   │   ├── copy-analyzer/
│   │   │   │   └── settings/
│   │   │   ├── (admin)/         # Admin panel
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/          # Sidebar, Topbar, etc.
│   │   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── charts/          # Recharts wrappers
│   │   │   └── shared/          # Shared components
│   │   ├── lib/
│   │   │   ├── firebase.ts      # Firebase client config
│   │   │   ├── api.ts           # FastAPI client
│   │   │   ├── utils.ts         # Utility functions
│   │   │   └── constants.ts     # App constants
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # Global styles
│   ├── public/
│   │   └── logo.png             # DG logo
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.local.example
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings & env vars
│   │   ├── database.py          # SQLAlchemy + asyncpg setup
│   │   ├── dependencies.py      # Dependency injection
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py    # API v1 router aggregator
│   │   │   │   ├── auth.py      # Auth endpoints
│   │   │   │   ├── meta.py      # Meta endpoints (Phase 4)
│   │   │   │   ├── dashboard.py # Dashboard endpoints
│   │   │   │   ├── campaigns.py
│   │   │   │   ├── adsets.py
│   │   │   │   ├── ads.py
│   │   │   │   ├── creatives.py
│   │   │   │   ├── insights.py
│   │   │   │   ├── recommendations.py
│   │   │   │   ├── billing.py
│   │   │   │   └── admin.py
│   │   │   └── __init__.py
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── subscription.py
│   │   │   ├── meta_connection.py
│   │   │   ├── meta_ad_account.py
│   │   │   ├── campaign.py
│   │   │   ├── ad_set.py
│   │   │   ├── ad.py
│   │   │   ├── creative.py
│   │   │   ├── metrics.py
│   │   │   ├── recommendation.py
│   │   │   └── base.py
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── meta_service.py
│   │   │   ├── sync_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── recommendation_service.py
│   │   │   ├── billing_service.py
│   │   │   └── encryption_service.py
│   │   ├── core/
│   │   │   ├── security.py      # Token verification, encryption
│   │   │   ├── firebase.py      # Firebase Admin SDK
│   │   │   └── exceptions.py    # Custom exceptions
│   │   ├── workers/             # Celery tasks
│   │   └── utils/
│   ├── alembic/                 # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── .gitignore
├── README.md
└── docker-compose.yml           # Redis for Celery
```

---

### Frontend — Next.js Setup

#### [NEW] `frontend/` — Next.js 14 App Router project

- Initialize with `npx create-next-app@latest` (TypeScript, Tailwind CSS, App Router, src directory)
- Install dependencies: `shadcn/ui`, `recharts`, `lucide-react`, `react-hook-form`, `zod`, `firebase`
- Configure Tailwind with custom design tokens matching the screenshot (blue primary, clean white cards, light grey background)
- Set up shadcn/ui with the default theme customized to match the design reference
- Create base layout with sidebar navigation and topbar
- Set up Firebase client SDK configuration
- Create API client utility for communicating with FastAPI backend

#### Key Design Tokens (from screenshot)

| Token | Value |
|-------|-------|
| Primary Blue | `#2563EB` (similar to Tailwind blue-600) |
| Success Green | `#16A34A` |
| Warning Orange | `#F59E0B` |
| Critical Red | `#EF4444` |
| Background | `#F8FAFC` (slate-50) |
| Card Background | `#FFFFFF` |
| Border | `#E2E8F0` (slate-200) |
| Text Primary | `#0F172A` (slate-900) |
| Text Secondary | `#64748B` (slate-500) |
| Sidebar BG | `#0F172A` (dark navy) |
| Sidebar Active | `#2563EB` |
| Font | Inter (Google Fonts) |

---

### Backend — FastAPI Setup

#### [NEW] `backend/` — FastAPI Python application

- Create FastAPI app with CORS middleware (allowing Next.js frontend)
- Set up SQLAlchemy async engine with asyncpg driver connecting to Supabase PostgreSQL
- Configure Alembic for database migrations
- Set up Pydantic settings for environment variable management
- Create Firebase Admin SDK initialization for token verification
- Create base model classes for SQLAlchemy
- Set up API versioning (`/api/v1/`)
- Create health check endpoint
- Set up structured logging (never log secrets)
- Create `.env.example` with all required environment variables

#### Environment Variables (Backend)

```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname

# Firebase
FIREBASE_PROJECT_ID=digital-growth-studio
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account.json

# Meta (Phase 4)
META_APP_ID=
META_APP_SECRET=

# Encryption
ENCRYPTION_KEY=

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Razorpay (Phase 9)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# AI (Phase 8)
AI_API_KEY=

# App
APP_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

### Shared Configuration

#### [NEW] `.gitignore`
- Node modules, Python venv, `.env` files, Firebase service account JSON, IDE files, build artifacts

#### [NEW] `README.md`
- Project overview, architecture diagram, setup instructions, development workflow

#### [NEW] `docker-compose.yml`
- Redis service for Celery background jobs (development)

---

## Phase 0 Deliverables

After Phase 0 is complete, you will have:

| ✅ | Deliverable |
|----|------------|
| ✅ | Next.js frontend running on `localhost:3000` |
| ✅ | FastAPI backend running on `localhost:8000` |
| ✅ | Tailwind CSS + shadcn/ui configured with custom design tokens |
| ✅ | Base layout: Sidebar + Topbar matching the screenshot |
| ✅ | Empty placeholder pages for all navigation items |
| ✅ | SQLAlchemy + asyncpg database connection to Supabase PostgreSQL |
| ✅ | Alembic migration setup |
| ✅ | Firebase SDK configured (frontend + backend) |
| ✅ | API versioning (`/api/v1/`) |
| ✅ | Health check endpoint |
| ✅ | Environment variable management |
| ✅ | `.gitignore` and `README.md` |
| ✅ | Docker Compose for Redis |
| ✅ | DG logo integrated |

After Phase 0, the app will show the full UI shell with sidebar navigation, but all pages will show "Coming Soon" or empty states. No auth, no data, no Meta connection yet.

---

## Verification Plan

### Automated Tests
- `cd frontend && npm run build` — Verify Next.js compiles without errors
- `cd backend && python -m pytest tests/test_health.py` — Verify FastAPI health endpoint returns 200

### Manual Verification
- Frontend loads at `http://localhost:3000` with sidebar and topbar
- Backend loads at `http://localhost:8000/docs` with Swagger UI
- Backend health check at `http://localhost:8000/api/v1/health` returns `{"status": "ok"}`
- Sidebar navigation matches the screenshot structure
- Design tokens match the reference (blue primary, white cards, clean layout)

---

## Build Order (Within Phase 0)

1. Initialize Next.js project
2. Initialize FastAPI project
3. Configure Tailwind + shadcn/ui design system
4. Build Sidebar component
5. Build Topbar component
6. Build base dashboard layout
7. Create empty page routes
8. Set up FastAPI with SQLAlchemy + Alembic
9. Set up Firebase config (both sides)
10. Create environment files
11. Create Docker Compose
12. Create `.gitignore` and `README.md`
13. Verify everything runs

---

## Full Phase Roadmap (For Reference)

| Phase | Description | Status |
|-------|------------|--------|
| **Phase 0** | Project Foundation | ✅ Completed |
| Phase 1 | Authentication (Firebase) | ✅ Completed |
| Phase 2 | Database Models + Migrations | ✅ Completed |
| Phase 3 | UI Shell (Sidebar, Topbar, Layout) | ✅ Completed |
| Phase 4 | Meta OAuth Connection | ✅ Completed |
| Phase 5 | Meta Sync Engine | ✅ Completed |
| Phase 6 | Analytics Engine | ✅ Completed |
| Phase 7 | Dashboard Pages | ✅ Completed |
| Phase 8 | AI Recommendations | ✅ Completed |
| Phase 9 | Billing (Razorpay) | ✅ Completed |
| Phase 10 | Admin Panel | ✅ Completed |
| Phase 11 | QA & Testing | ✅ Completed |
| Phase 12 | Meta App Review Prep | ✅ Completed |
