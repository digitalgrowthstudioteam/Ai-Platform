# Digital Growth Studio — AI Ads Optimizer

> AI-powered Meta Ads analytics and optimization platform.

## Architecture

```
USER → Next.js App → Firebase Auth → FastAPI → PostgreSQL (Supabase)
                                        ↓
                                    Meta Marketing API (read-only)
                                        ↓
                                    AI/ML Engine
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Firebase Authentication |
| Backend | FastAPI + Python |
| Database | Supabase PostgreSQL |
| ORM | SQLAlchemy + asyncpg |
| Background Jobs | Celery + Redis |
| Meta | Marketing API (read-only) |
| Payments | Razorpay |

## Project Structure

```
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── docker-compose.yml # Redis for development
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Redis (via Docker or local)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env     # Edit with your values
uvicorn app.main:app --reload --port 8000
# Runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Redis (for Celery)

```bash
docker-compose up -d redis
```

## Environment Variables

See:
- `frontend/.env.local.example`
- `backend/.env.example`

**Never commit `.env` files or Firebase service account JSON to version control.**

## Development Phases

| Phase | Description | Status |
|-------|------------|--------|
| 0 | Project Foundation | ✅ |
| 1 | Authentication | ✅ |
| 2 | Database Models | ✅ |
| 3 | UI Shell | ✅ |
| 4 | Meta Connection | ✅ |
| 5 | Meta Sync | ✅ |
| 6 | Analytics Engine | ✅ |
| 7 | Dashboard Pages | ✅ |
| 8 | AI Recommendations | ✅ |
| 9 | Billing (Razorpay) | ✅ |
| 10 | Admin Panel | ✅ |
| 11 | QA & Testing | ✅ |
| 12 | Meta App Review | ✅ |

## License

Proprietary — All rights reserved.
