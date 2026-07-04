# Deployment Guide — Adavi Digital Institute LMS

This guide covers deploying the platform unmodified to **Hostinger VPS** (Docker) and **Google Cloud**
(Cloud Run or Compute Engine/GKE).

---

## 1. Hostinger VPS (Docker Compose)

### 1.1 Provision the server
1. Order a Hostinger VPS with **Ubuntu 22.04 LTS** (KVM 2 or higher recommended for production traffic).
2. SSH in: `ssh root@YOUR_VPS_IP`
3. Install Docker + Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com | sh
   apt install -y docker-compose-plugin
   ```

### 1.2 Deploy the code
```bash
git clone <your-repo-url> adavi-lms
cd adavi-lms
cp .env.example .env
nano .env   # set strong DB password, JWT secrets, payment/AI keys, and your real domain
```

Generate strong secrets:
```bash
openssl rand -hex 32   # use for JWT_ACCESS_SECRET
openssl rand -hex 32   # use for JWT_REFRESH_SECRET
```

### 1.3 Point your domain
In Hostinger's DNS zone editor (or wherever your domain is registered), create an **A record**:
```
adavidigitalinstitute.com    A    YOUR_VPS_IP
www.adavidigitalinstitute.com    A    YOUR_VPS_IP
```
Wait for propagation (`dig adavidigitalinstitute.com` should return your VPS IP).

### 1.4 First launch
```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed   # optional: demo data
```
Verify:
```bash
curl http://YOUR_VPS_IP/api/v1/health
```

### 1.5 Enable HTTPS (Let's Encrypt / Certbot)
```bash
apt install -y certbot
docker compose stop nginx
certbot certonly --standalone -d adavidigitalinstitute.com -d www.adavidigitalinstitute.com
```
Then uncomment the HTTPS `server` block in `nginx/default.conf`, mount the certificate directory in
`docker-compose.yml` under the `nginx` service:
```yaml
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```
Restart: `docker compose up -d nginx`. Certbot auto-renews via its own systemd timer; add a cron job to
reload Nginx after renewal if needed:
```bash
echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f /root/adavi-lms/docker-compose.yml restart nginx'" | crontab -
```

### 1.6 Ongoing deploys
Either run manually:
```bash
git pull && docker compose up -d --build && docker compose exec backend npx prisma migrate deploy
```
or use the included `.github/workflows/deploy.yml` GitHub Action (configure `VPS_HOST`, `VPS_USER`,
`VPS_SSH_KEY` repository secrets) to deploy automatically on every push to `main`.

---

## 2. Google Cloud

### Option A — Cloud Run (recommended: simplest, auto-scaling, pay-per-use)
1. **Cloud SQL for PostgreSQL** — create an instance, database `adavi_lms`, note the connection name.
2. **Memorystore for Redis** — create a Basic tier instance in the same VPC.
3. **Artifact Registry** — create a Docker repository:
   ```bash
   gcloud artifacts repositories create adavi-lms --repository-format=docker --location=us-central1
   ```
4. **Build & push images:**
   ```bash
   gcloud builds submit ./backend  --tag us-central1-docker.pkg.dev/PROJECT_ID/adavi-lms/backend
   gcloud builds submit ./frontend --tag us-central1-docker.pkg.dev/PROJECT_ID/adavi-lms/frontend
   ```
5. **Deploy backend:**
   ```bash
   gcloud run deploy adavi-backend \
     --image us-central1-docker.pkg.dev/PROJECT_ID/adavi-lms/backend \
     --add-cloudsql-instances PROJECT_ID:us-central1:adavi-sql \
     --set-env-vars DATABASE_URL=postgresql://...,REDIS_URL=...,JWT_ACCESS_SECRET=...,JWT_REFRESH_SECRET=... \
     --vpc-connector adavi-connector \
     --region us-central1 --allow-unauthenticated
   ```
6. **Deploy frontend** the same way, setting `NEXT_PUBLIC_API_URL` to the backend's Cloud Run URL.
7. **Run migrations** once via Cloud Run Jobs or `gcloud run services proxy` + local `prisma migrate deploy`.
8. Map a custom domain via **Cloud Run → Manage Custom Domains**.

### Option B — Compute Engine / GKE (more control, same Docker artifacts)
- Compute Engine: provision a VM, install Docker, follow the same steps as the Hostinger VPS section above.
- GKE: convert `docker-compose.yml` into Kubernetes Deployments/Services (or use `kompose convert`), push
  images to Artifact Registry, and apply manifests with `kubectl apply -f`. Use Cloud SQL Auth Proxy as a
  sidecar for the database connection.

---

## 3. Post-deployment checklist
- [ ] `.env` secrets are strong and unique (never reuse the `.env.example` placeholders)
- [ ] HTTPS is enabled and HTTP redirects to HTTPS
- [ ] Database backups are scheduled (Cloud SQL automated backups, or `pg_dump` cron on VPS)
- [ ] Payment gateway webhooks point to `https://yourdomain.com/api/v1/payments/webhook/{provider}`
- [ ] SMTP credentials are set so transactional emails send
- [ ] `AI_API_KEY` is set if AI features should be active
- [ ] Monitoring/uptime checks are configured (e.g. UptimeRobot, Google Cloud Monitoring)
