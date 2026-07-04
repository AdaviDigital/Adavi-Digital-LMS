# System Architecture — Adavi Digital Institute LMS

## 1. High-Level Architecture

```
                              ┌─────────────────────────┐
                              │        Users (Web)       │
                              └────────────┬─────────────┘
                                           │ HTTPS
                              ┌────────────▼─────────────┐
                              │   Nginx Reverse Proxy     │  (TLS, gzip, rate limit)
                              └───────┬───────────┬───────┘
                       ┌──────────────┘           └──────────────┐
             ┌─────────▼─────────┐                     ┌─────────▼─────────┐
             │  Frontend (Next.js) │                    │  Backend API (Express)│
             │  Port 3000           │                   │  Port 4000, /api/v1  │
             └─────────┬─────────┘                      └───┬──────┬──────┬───┘
                        │  REST/JSON                          │      │      │
                        └──────────────────────────────────────┘      │      │
                                                       ┌────────────────▼┐   ┌▼──────────┐
                                                       │  PostgreSQL 16    │  │  Redis 7   │
                                                       │  (Prisma ORM)     │  │ (cache/queue)
                                                       └────────────────┘   └────────────┘
                                             ┌───────────────┼───────────────┐
                                     ┌────────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
                                     │ Object Storage │ │ Payment     │ │ AI Provider │
                                     │ (S3-compatible/│ │ Gateways    │ │ (OpenAI-    │
                                     │ local volume)   │ │ Paystack/   │ │ compatible) │
                                     │                 │ Flutterwave/ │ │             │
                                     │                 │ Stripe/PayPal│ │             │
                                     └────────────────┘ └─────────────┘ └─────────────┘
```

## 2. Design Principles
- **Clean Architecture / layered backend:** `routes → controllers → services → repositories (Prisma) → DB`.
- **SOLID:** each service has a single responsibility; interfaces used for payment/AI/notification providers
  so implementations are swappable (Strategy pattern).
- **Stateless API:** JWT access tokens (15 min) + refresh tokens (7 days, stored hashed in DB, rotate on use).
- **12-factor config:** all config via environment variables.
- **Idempotent migrations:** Prisma Migrate, versioned, reproducible.

## 3. Repository Layout
```
adavi-lms/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/         # auth, users, courses, lessons, quizzes, exams,
│   │   │                    # assignments, enrollments, payments, certificates,
│   │   │                    # notifications, ai, analytics, blog, faq, admin
│   │   ├── prisma/
│   │   ├── utils/
│   │   └── server.ts
│   ├── prisma/schema.prisma
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── default.conf
├── docs/                    # PRD, ARCHITECTURE, ERD, API docs, manuals
├── postman/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## 4. Request Flow (example: Student watches a lesson)
1. Browser → Nginx → Next.js SSR page `/courses/[slug]/lessons/[lessonId]`.
2. Next.js calls `GET /api/v1/lessons/:id` on the backend (server-side, with JWT from httpOnly cookie).
3. Express `authMiddleware` verifies JWT → `rbacMiddleware` checks enrollment → `LessonController` →
   `LessonService` → Prisma → PostgreSQL.
4. Response includes signed video URL (from object storage), transcript, AI summary (cached in Redis).
5. `POST /api/v1/progress` fired on video milestone events to update `StudentProgress`.

## 5. AI Integration Points
| Feature | Endpoint | Behavior |
|---|---|---|
| AI Chat Tutor | `POST /api/v1/ai/chat` | Lesson-context-aware chat, streams response |
| AI Lesson Summary | `POST /api/v1/ai/summarize` | Summarizes transcript, cached per lesson |
| AI Quiz Generation | `POST /api/v1/ai/generate-quiz` | Instructor tool: generates draft questions from lesson content |
| AI Course Recommendations | `GET /api/v1/ai/recommendations` | Based on enrollment history + browsing |

All AI calls go through a single `AIProviderAdapter` interface so the underlying model provider is swappable
via `.env` (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`).

## 6. Security Architecture
- HTTPS enforced at Nginx; HSTS header.
- JWT access + rotating refresh tokens; passwords hashed with bcrypt (cost 12).
- RBAC middleware (`student`, `instructor`, `admin`) on every protected route.
- `helmet` for security headers; `csurf`-style double-submit CSRF token for cookie-based state changes.
- Input validation via `zod` schemas on every endpoint.
- Parameterized queries only (Prisma) — no raw SQL string concatenation.
- `express-rate-limit` + Redis store for API throttling; stricter limits on auth endpoints.
- File upload validation: MIME-type allowlist, size caps, virus-scan hook, stored outside web root.
- Audit log table records all sensitive admin/instructor actions.

## 7. Scalability Path (toward multi-tenant SaaS)
- Add `tenant_id` (nullable in Phase 1) to core tables; introduce a `tenants` table.
- Move object storage to S3-compatible bucket per tenant prefix.
- Introduce a queue (BullMQ + Redis) for certificate generation, email/SMS sending, video transcoding.
- Horizontal scale: stateless backend containers behind a load balancer; sticky-session-free JWT auth.
