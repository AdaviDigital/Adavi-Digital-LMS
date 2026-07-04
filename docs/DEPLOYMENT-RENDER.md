# Deploying to Render

Render is a strong fit for this project: it offers managed PostgreSQL *and* managed Redis (unlike
Hostinger Business Hosting), plus zero-downtime deploys, built-in health checks, and log streaming —
all natively, without Docker being required (though the included Dockerfiles work too, if preferred).

This guide deploys four Render resources: a **PostgreSQL** instance, a **Redis** instance, a **Web
Service** for the backend, and a **Web Service** for the frontend.

---

## 1. Create the managed database
1. Render Dashboard → **New → PostgreSQL**.
2. Name: `adavi-lms-db`. Region: pick the same region you'll use for the web services (lower latency,
   and Render's internal network is free/faster between same-region services).
3. Plan: Starter is fine to begin; note the **Internal Database URL** once it's provisioned — this is
   what your backend will use as `DATABASE_URL` (internal URLs are free, not billed as egress).

## 2. Create the managed Redis instance
1. Render Dashboard → **New → Redis**.
2. Name: `adavi-lms-redis`. Same region as the database.
3. Copy the **Internal Redis URL** — used as `REDIS_URL`. (Redis is optional for this app — every
   Redis call is wrapped defensively — but Render makes it free/easy to include, so there's no reason
   to skip it here the way you might on a plan that doesn't offer it.)

## 3. Deploy the backend as a Web Service
1. Render Dashboard → **New → Web Service** → connect your GitHub repo.
2. **Root Directory:** `backend` (this is a monorepo; Render supports subdirectory builds natively).
3. **Runtime:** Node
4. **Build Command:**
   ```bash
   npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
   ```
5. **Start Command:**
   ```bash
   npm run start
   ```
6. **Health Check Path:** `/api/v1/health/ready` — this endpoint actually pings the database (see
   `docs/ARCHITECTURE.md` / the DevOps review notes on liveness vs. readiness) so Render will correctly
   detect a backend that's up but can't reach its database, instead of reporting false-healthy.
7. **Environment Variables** — add these (Render → your service → Environment):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Internal Database URL from step 1)* |
   | `REDIS_URL` | *(Internal Redis URL from step 2)* |
   | `JWT_ACCESS_SECRET` | output of `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | a **different** `openssl rand -hex 32` output |
   | `CORS_ORIGIN` | `https://your-frontend.onrender.com` (update once you have the real domain) |
   | `AI_API_KEY`, `AI_MODEL` | if using AI features |
   | `PAYSTACK_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` / `STRIPE_SECRET_KEY` / `PAYPAL_CLIENT_ID`+`PAYPAL_CLIENT_SECRET` | whichever gateways you're using |
   | `STRIPE_WEBHOOK_SECRET`, `FLUTTERWAVE_WEBHOOK_HASH`, `PAYPAL_WEBHOOK_ID` | **required** for webhook signature verification — see §6 below |
   | `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` | for transactional email |
   | `LOG_LEVEL` | `info` (or `debug` while diagnosing an issue) |

   Note: as of this project's env validation, the app will **refuse to start** in production if
   `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`DATABASE_URL` are missing, too short, or identical to each
   other — this is intentional (see the DevOps review); Render's deploy log will show exactly which
   check failed.
8. Deploy. Watch the build log — the first deploy runs your Prisma migrations automatically.

## 4. Deploy the frontend as a second Web Service
1. **New → Web Service**, same repo.
2. **Root Directory:** `frontend`
3. **Build Command:** `npm ci && npm run build`
4. **Start Command:** `npm run start -- -p $PORT` (Render assigns `$PORT`; Next.js must bind to it)
5. **Environment Variables:**
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com/api/v1` |
6. Deploy.

## 5. Wire the two together and add custom domains
1. Once both services have their `*.onrender.com` URLs, update the backend's `CORS_ORIGIN` to the
   frontend's real URL (or your final custom domain) and redeploy.
2. Render → each service → **Settings → Custom Domains** — add `adavidigitalinstitute.com` to the
   frontend service and `api.adavidigitalinstitute.com` to the backend service. Render provisions free
   TLS certificates automatically once DNS is pointed correctly (CNAME to the `.onrender.com` target).

## 6. Configure payment webhooks (required before going live with real payments)
The backend now verifies webhook signatures cryptographically — an unsigned or incorrectly signed
webhook is rejected with 401 rather than trusted blindly. Point each gateway's webhook URL at
`https://api.adavidigitalinstitute.com/api/v1/payments/webhook/<provider>` and set the matching secret:

| Gateway | Webhook URL suffix | Secret env var | Where to find it |
|---|---|---|---|
| Paystack | `/paystack` | `PAYSTACK_SECRET_KEY` *(reused — Paystack signs with your secret key itself)* | Dashboard → Settings → API Keys |
| Stripe | `/stripe` | `STRIPE_WEBHOOK_SECRET` | Dashboard → Developers → Webhooks → your endpoint → Signing secret |
| Flutterwave | `/flutterwave` | `FLUTTERWAVE_WEBHOOK_HASH` | Dashboard → Settings → Webhooks → set a "secret hash" value yourself, then put the same value here |
| PayPal | `/paypal` | `PAYPAL_WEBHOOK_ID` | **Not yet cryptographically verified** — see "Known follow-ups" below. Do not rely on PayPal webhooks alone for fulfilment until this is implemented; the `/payments/verify/:provider/:reference` endpoint (called from the checkout return page) independently re-checks payment status directly against PayPal's API and is safe to rely on today. |

## 7. Monitoring on Render
- **Logs:** Render → your service → **Logs** streams stdout/stderr live; the app now emits structured
  JSON logs in production (see the DevOps review), so they filter/search cleanly in Render's log view
  or an external log drain.
- **Metrics:** Render's built-in CPU/Memory graphs are visible per service under **Metrics** — watch
  these after launch to right-size the plan.
- **Alerts:** Render → service → **Settings → Notifications** — enable deploy-failure and health-check
  failure alerts to your email/Slack.
- **External uptime monitoring:** point a free UptimeRobot/Better Stack monitor at
  `https://api.adavidigitalinstitute.com/api/v1/health` (fast liveness check, no DB dependency) so you
  get paged even if Render's own dashboard is the thing having a bad day.
- **Error tracking:** an `SENTRY_DSN` environment variable is already read into config
  (`backend/src/config/env.ts`) as a placeholder for wiring in Sentry or a similar APM tool — actual
  SDK integration is a recommended near-term follow-up, not yet implemented (see the DevOps review).

## 8. Ongoing deploys
Render auto-deploys on every push to your connected branch by default (**Settings → Auto-Deploy**).
The `.github/workflows/deploy.yml` in this repo assumes SSH access to a VPS and does **not** apply to
Render — either disable/remove that workflow, or leave it as a reference for if you later add a VPS
environment alongside Render. `.github/workflows/ci.yml` (typecheck/lint/test/build) still applies
and is a useful required check on pull requests regardless of where you deploy.

## Known follow-ups (see the DevOps review for full context)
- PayPal webhook signature verification is not yet implemented (requires a call to PayPal's
  `/v1/notifications/verify-webhook-signature` API rather than a local HMAC check).
- Sentry/APM wiring is scaffolded (`SENTRY_DSN` is read into config) but no SDK is installed yet.
- Consider Prisma connection pooling (e.g. `?connection_limit=5` on `DATABASE_URL`, or Prisma Accelerate)
  once you scale the backend to multiple Render instances, so you don't exhaust Postgres's max
  connections.
