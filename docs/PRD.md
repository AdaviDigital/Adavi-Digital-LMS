# Product Requirements Document (PRD)
## Adavi Digital Institute — Learning Management System (LMS)

**Version:** 1.0
**Owner:** Adavi Digital Institute
**Location:** Ikorodu, Lagos, Nigeria
**Contact:** info@adavidigitalinstitute.com | +2348062177435

---

## 1. Vision
Adavi Digital Institute LMS is a modern, AI-powered, multi-role learning platform enabling institutions,
instructors, and students in Nigeria and internationally to deliver, consume, and manage online education —
courses, quizzes, exams, assignments, certificates, and payments — in a single secure, scalable product.
The architecture is designed so the same codebase can later become a **multi-tenant SaaS** offering.

## 2. Goals
- Launch a production-ready LMS MVP covering course delivery, assessments, certification, and payments.
- Support three core roles: **Student**, **Instructor**, **Admin** (Super Admin reserved for SaaS phase).
- Provide AI-assisted learning: lesson summaries, AI chat tutor, AI-generated quiz questions, AI course
  recommendations.
- Be deployable unmodified to a Hostinger VPS (Docker) or Google Cloud (Cloud Run / Compute Engine / GKE).
- Meet WCAG 2.2 AA accessibility and OWASP Top 10 security baselines.

## 3. Non-Goals (Phase 1)
- Native mobile apps (responsive web only in Phase 1).
- Full multi-tenant billing/white-labeling (schema is designed to allow it later via a `tenant_id` column
  strategy, but Phase 1 ships single-tenant).
- Live video conferencing (webinar) — placeholder integration point only.

## 4. User Roles & Core Journeys

### 4.1 Student
Register → browse catalog → enroll (free/paid) → watch lessons → download resources → take quizzes/exams →
submit assignments → track progress → earn certificate → message instructor → leave review.

### 4.2 Instructor
Register → apply for instructor status → create course (modules → lessons → videos/PDFs/quizzes) → publish →
manage students → grade assignments → view analytics/revenue → respond to reviews.

### 4.3 Admin
Manage users, courses (approve/reject), categories, coupons, payments, certificates, site content (blog/FAQ),
analytics, audit logs, settings, notifications.

## 5. Feature Set (Mapped to Modules)

| Module | Key Features |
|---|---|
| Public Site | Home, Course Catalog, Course Detail, About, Contact, Blog, FAQ |
| Auth | Register, Login, Email verification, Forgot/Reset password, JWT + Refresh, RBAC |
| Course Management | CRUD, modules, lessons, resources, pricing, levels, languages |
| Course Catalog | Instant search, filters (category, price, rating, level, language, duration, certification) |
| Lesson Player | Video streaming, resume playback, speed control, captions, transcript, AI summary, AI chat, notes |
| Video Management | Upload MP4/MOV/AVI/MKV, streaming, PiP, bookmarking |
| Quizzes | MCQ, True/False, Essay, Matching, Drag & Drop, Fill-in-blank, timer, auto/manual grading, AI-generated |
| Exams | Secure timed exams, question bank, randomization, anti-cheating, pass/fail |
| Assignments | File/PDF/link/project submission, grading, comments, regrade |
| Certificates | Auto-generated PDF w/ QR code, certificate ID, verification URL, digital signature |
| Payments | Paystack, Flutterwave, Stripe, PayPal, Google Pay, coupons, installments, subscriptions, refunds |
| Notifications | Email, SMS, WhatsApp, Push, In-app |
| Dashboards | Student, Instructor, Admin — each with tailored analytics |
| Analytics | Revenue, engagement, completion, retention, active users |
| AI Features | AI Chat Tutor, AI lesson summary, AI quiz generation, AI course recommendations |
| Security | HTTPS, JWT, RBAC, CSRF/XSS/SQLi protection, rate limiting, audit logs, encrypted passwords |
| Contact Page | Contact form, Google Maps, WhatsApp click-to-chat, office hours, social links |

## 6. Success Metrics
- Course completion rate, active monthly learners, instructor revenue, payment success rate,
  average lesson load time (<2s on 4G), Lighthouse score ≥ 90 (Performance/SEO/Accessibility).

## 7. Technical Constraints
- Must run unmodified via Docker Compose on a Hostinger VPS (Ubuntu) and on Google Cloud
  (Cloud Run/Compute/GKE) — see `DEPLOYMENT.md`.
- PostgreSQL as system of record; Redis for cache/sessions/queues.
- All secrets via environment variables (`.env`), never hardcoded.

## 8. Release Plan
1. **Phase 1** — Architecture, DB schema/migrations, Docker foundation ✅ complete
2. **Phase 2** — Backend REST API: auth, courses, lessons, enrollments, payments, quizzes, exams, assignments, certificates, coupons, reviews, messages, notifications, blog, faq, admin, analytics, AI ✅ complete
3. **Phase 3** — Frontend (public site, dashboards, course player, admin panel) — in progress
4. **Phase 4** — Seed data, Postman collection, automated tests, CI/CD, deployment guides, user manuals — pending
