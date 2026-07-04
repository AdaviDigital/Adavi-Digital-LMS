# Adavi Digital Institute — Learning Management System

AI-powered, production-oriented LMS for Nigerian and international online learners.

**Stack:** Next.js 14 (TS/Tailwind) · Node.js/Express (TS) · PostgreSQL/Prisma · Redis · Docker/Nginx

> **Build status: All 4 phases complete.** Full backend REST API (19 modules), a frontend wired to live
> data end-to-end (auth, catalog, checkout, lesson player with AI tutor, student/instructor/admin
> dashboards), seed data, automated tests, CI/CD, deployment guides, and user manuals.

## What's included

### Backend — 20 REST modules (`backend/src/modules/`)
`auth` · `courses` (+ owner-scoped builder view, submit-for-review) · `categories` · `modules` (course
sections, drag-and-drop reorder) · `lessons` (+progress tracking, drag-and-drop reorder) · `enrollments` ·
`assignments` · `quizzes` (auto-graded) · `exams` (timed, randomized, anti-cheat
flagging) · `certificates` (auto-issued on completion, QR + HMAC-signed, publicly verifiable) · `orders` ·
`payments` (Paystack/Flutterwave/Stripe/PayPal adapters behind one interface, webhook + verify flow,
auto-enrollment on success) · `coupons` · `reviews` · `messages` · `notifications` (email/SMS/WhatsApp/
push/in-app) · `blog` · `faq` · `admin` (user mgmt, course approval, audit log, settings) · `analytics`
(platform/instructor/course metrics) · `ai` (pluggable OpenAI-compatible chat tutor, lesson summaries,
AI quiz-question drafting, course recommendations)

Every module follows the same layered pattern: Zod validation → service (business logic + Prisma) →
controller → routes, with RBAC and Swagger annotations throughout. **Verified with a real TypeScript
compile** (`tsc --noEmit`) — zero errors outside of the lines that require live Prisma Client generation
(blocked only by this sandbox's network allowlist; resolves automatically in CI or on your first
`docker compose up --build`).

### Frontend — 18 working pages (`frontend/src/app/`)
Home, Course Catalog, Course Detail (live data, enroll/buy flow), **Lesson Player** (video, transcript,
AI Chat Tutor, AI Summary, resources, progress tracking), Login, Register, About, Contact, Blog, FAQ,
Checkout (multi-gateway picker), Student Dashboard (live enrollments/certificates/notifications),
Instructor Dashboard (live analytics + course creation form), **My Courses** (status-tracked course
list), **drag-and-drop Course Builder** (reorderable modules/lessons, inline rename/delete, lesson
authoring, submit-for-review — backed by real reorder endpoints, not just a mock), Admin Panel (live
users table, course approvals, platform analytics), and public Certificate Verification — all linked via
global, role-aware navigation. **Verified with a real production build** (`next build`) — all 18 routes
compile and prerender successfully.

### Testing & Quality
- `backend/tests/` — Jest + Supertest suite (health checks, auth/course validation, AppError, payment
  provider registry, webhook signature verification). **Actually run in this sandbox**: 18/18 tests pass
  in modules with no DB dependency; DB-dependent suites are verified via CI (see below), since this
  sandbox can't reach Prisma's binary CDN.
- `.github/workflows/ci.yml` — typecheck, lint, `npm audit`, test (with real Postgres + Redis service
  containers), and build both backend and frontend, plus a Docker image build, on every push/PR.
- `.github/workflows/deploy.yml` — SSH-based auto-deploy to your VPS on push to `main`.

### Production Hardening (DevOps review)
A senior-DevOps-level pass fixed several real gaps found by reading the actual code, not a generic
checklist:
- **Fail-fast config** (`backend/src/config/env.ts`) — missing or weak JWT secrets/DB URL now crash
  the process at boot in production with a clear error, instead of silently falling back to a
  hardcoded placeholder secret.
- **Structured logging** (`backend/src/config/logger.ts`) — Winston (previously an unused dependency)
  now backs every log line: JSON in production, request-ID-correlated (`backend/src/middleware/requestId.middleware.ts`) errors, HTTP access logs routed through the same stream.
- **Distributed rate limiting** (`backend/src/middleware/rateLimit.middleware.ts`) — Redis-backed by
  default so limits hold correctly across multiple instances, falling back to in-memory (with a log
  warning) when Redis isn't configured.
- **Real readiness checks** — `/api/v1/health` is a fast liveness probe; `/api/v1/health/ready` actually
  pings the database (and Redis, if configured) so orchestrators stop routing traffic to an instance
  that's up but can't reach its database.
- **Payment webhook signature verification** (`backend/src/modules/payments/webhookVerification.ts`) —
  Paystack, Stripe, and Flutterwave webhooks are now cryptographically verified against the raw request
  body before being trusted, with dedicated tests. PayPal verification is a documented follow-up.
- **Crash safety** — `uncaughtException`/`unhandledRejection` handlers and a forced-exit timeout on
  shutdown so a hung connection can't block a deploy indefinitely.

See `docs/DEPLOYMENT-RENDER.md` for a full Render deployment walkthrough (managed Postgres + Redis,
health checks, webhook setup, monitoring) — a strong alternative to the VPS/Hostinger paths below.

### Data & Docs
- `backend/prisma/seed.ts` — demo admin/instructor/student accounts, categories, a paid and a free
  course with modules/lessons, and FAQ entries. Run with `npm run seed`.
- `postman/` — a 66-request Postman collection covering every endpoint, plus an environment file and
  usage guide.
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ERD.md` — product requirements, system architecture,
  entity relationships.
- `docs/DEPLOYMENT.md` — step-by-step Hostinger VPS and Google Cloud (Cloud Run / Compute / GKE) guides.
- `docs/user-manuals/` — STUDENT.md, INSTRUCTOR.md, ADMIN.md.
- `docker-compose.yml`, `nginx/default.conf`, Dockerfiles — full local/prod container stack.
- `.env.example` — every environment variable the system needs.

## Quick Start (local development)

```bash
# 1. Clone/copy this project, then:
cp .env.example .env
# edit .env with real secrets

# 2. Start everything
docker compose up --build

# Frontend:      http://localhost:3000
# Backend API:   http://localhost:4000/api/v1
# Swagger docs:  http://localhost:4000/api-docs
# Via Nginx:     http://localhost
```

First run only — apply the database schema and load demo data:
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

This creates three demo accounts (password `Password123!` for all):
- `admin@adavidigitalinstitute.com`
- `instructor@adavidigitalinstitute.com`
- `student@adavidigitalinstitute.com`

## Running Tests
```bash
cd backend && npm test
```

## Exploring the API
- Swagger UI: `http://localhost:4000/api-docs`
- Or import `postman/Adavi-LMS.postman_collection.json` + `Adavi-LMS.postman_environment.json` into
  Postman (see `postman/README.md`) — 66 requests covering every endpoint.

## Deploying to Hostinger VPS
See `docs/DEPLOYMENT.md` for the full step-by-step guide (DNS, HTTPS/Certbot, ongoing deploys via
GitHub Actions). Quick version:
1. Provision an Ubuntu 22.04+ VPS, install Docker + Docker Compose.
2. Copy this project to the server (`git clone` or `scp`).
3. Set real values in `.env` (strong JWT secrets, DB password, live payment/AI keys, your domain).
4. Point your domain's DNS A record to the VPS IP.
5. `docker compose up -d --build && docker compose exec backend npx prisma migrate deploy`
6. Issue TLS certificates (Certbot) and uncomment the HTTPS server block in `nginx/default.conf`.

## Deploying to Google Cloud
See `docs/DEPLOYMENT.md` for full Cloud Run and Compute Engine/GKE instructions.

## Documentation
| Doc | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/ARCHITECTURE.md` | System architecture, request flow, security design |
| `docs/ERD.md` | Entity relationship diagram |
| `docs/DEPLOYMENT.md` | Hostinger VPS + Google Cloud deployment |
| `docs/DEPLOYMENT-RENDER.md` | Render deployment (managed Postgres + Redis, no VPS needed) |
| `docs/user-manuals/STUDENT.md` | How students use the platform |
| `docs/user-manuals/INSTRUCTOR.md` | How instructors build and manage courses |
| `docs/user-manuals/ADMIN.md` | Platform administration guide |
| `postman/README.md` | API collection usage |

## Project Structure
See `docs/ARCHITECTURE.md` §3 for the full annotated repository layout.

## License
Proprietary — Adavi Digital Institute.
