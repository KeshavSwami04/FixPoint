# FixPoint — Deployment Guide

## Option A: Docker (local / any VPS)

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY, CRON_SECRET, DB_PASSWORD

docker compose up --build
# → open http://localhost
```

---

## Option B: Railway (backend + DB) + Vercel (frontend)

This is the recommended free-tier production setup.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create fixpoint --public --push
```

---

### 2. Deploy MySQL on Railway

1. Go to [railway.app](https://railway.app) → New Project → **Add a service → Database → MySQL**
2. Once provisioned, click the MySQL service → **Variables** tab
3. Note these values — you'll need them:
   - `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`

---

### 3. Deploy Flask backend on Railway

1. In the same Railway project → **New Service → GitHub Repo**
2. Select your repo — set **Root Directory** to `backend`
3. Railway will detect the Dockerfile automatically
4. Go to **Variables** and add:

| Variable | Value |
|---|---|
| `SECRET_KEY` | `openssl rand -hex 32` output |
| `CRON_SECRET` | `openssl rand -hex 16` output |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `FRONTEND_URL` | your Vercel URL (add after step 4) |

5. Railway will deploy and give you a URL like `https://fixpoint-backend-xxxx.railway.app`

---

### 4. Deploy React frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Vite — no build config needed
4. Add this **Environment Variable** in the Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_API_URL` | your Railway backend URL (e.g. `https://fixpoint-backend-xxxx.railway.app`) |

5. Deploy. Vercel gives you `https://fixpoint-xxxx.vercel.app`

---

### 5. Link them together

1. Back in Railway → your backend service → Variables
2. Set `FRONTEND_URL` = your Vercel URL (e.g. `https://fixpoint-xxxx.vercel.app`)
3. Redeploy the backend

---

### 6. Initialize the database

Railway MySQL doesn't run `init.sql` automatically (unlike Docker).
Run it once from your local machine:

```bash
# Install mysql client if needed: brew install mysql-client
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> < db/init.sql
```

Or use TablePlus / DBeaver / MySQL Workbench with the Railway connection details.

---

## Optional: Auto-escalation cron job (Railway)

Railway supports cron jobs natively:

1. In your Railway project → **New Service → Cron Job**
2. Command: `curl -X POST https://your-backend.railway.app/api/escalations/sweep -H "X-Cron-Secret: YOUR_CRON_SECRET"`
3. Schedule: `0 * * * *` (every hour)

This replaces the background thread — more reliable on cloud infrastructure.

---

## Security checklist before going live

- [ ] `SECRET_KEY` is a random 32-byte hex string
- [ ] `DB_PASSWORD` is strong and not the default
- [ ] `CRON_SECRET` is set and matches the cron job header
- [ ] `FRONTEND_URL` is your exact Vercel domain (no trailing slash)
- [ ] `.env` is in `.gitignore` (it already is)
- [ ] Passwords in the DB are bcrypt-hashed (they are — registration hashes them)
