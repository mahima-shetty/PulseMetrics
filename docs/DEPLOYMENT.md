# AI Founder Dashboard - Deployment Guide

## Prerequisites

- Docker and Docker Compose (for local deployment)
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

## Local Development

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

### 2. Backend Setup

```bash
cd backend
cp ../.env.example .env   # Edit .env with your settings
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local   # Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://founder:founder_secret@localhost:5432/founderdashboard |
| JWT_SECRET_KEY | Secret for JWT signing | (required in production) |
| OPENAI_API_KEY | OpenAI or Groq API key for AI features | (optional) |
| LLM_BASE_URL | Override API URL (for Groq) | - |
| LLM_MODEL | Model name (e.g. gpt-4o-mini) | gpt-4o-mini |
| CORS_ORIGINS | Comma-separated frontend URLs | http://localhost:3000 |

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | Backend API URL (e.g. http://localhost:8000) |

## Docker Deployment

### Full Stack (PostgreSQL + Backend)

```bash
docker-compose up -d
```

- PostgreSQL: localhost:5432
- Backend API: localhost:8000

### Build Backend Only

```bash
docker-compose build backend
docker-compose up -d backend
```

## Deploy to Vercel (Frontend)

1. Connect your Git repository to Vercel
2. Set root directory to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
4. Deploy

## Deploy to Render (Backend)

1. Create a new Web Service
2. Connect your repository
3. Build command: `pip install -r backend/requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL from Render dashboard
6. Set environment variables (DATABASE_URL, JWT_SECRET_KEY, etc.)
7. Set root directory to `backend` or adjust paths

## Deploy to Railway (Full Stack)

Recommended for demos: easy setup, built-in PostgreSQL, supports RAG features.

### Step 1: Create Project and PostgreSQL

1. Go to [railway.app](https://railway.app) and sign in (GitHub recommended)
2. **New Project** → **Provision PostgreSQL**
3. Click the PostgreSQL service → **Variables** → copy `DATABASE_URL` (or use the reference `${{Postgres.DATABASE_URL}}`)

### Step 2: Deploy Backend

1. In the same project, click **New** → **GitHub Repo** → connect your FounderDashboard repo
2. Select the new service → **Settings**:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET_KEY` | (generate a strong random string) |
   | `CORS_ORIGINS` | `https://your-frontend-url.railway.app` (add after frontend deploys) |
   | `OPENAI_API_KEY` or `GROQ_API_KEY` | Your API key for RAG/AI features |
   | `LLM_MODEL` | `gpt-4o-mini` or `llama-3.1-8b-instant` |

4. **Settings** → **Networking** → **Generate Domain** to get the backend URL (e.g. `https://backend-xxx.railway.app`)

### Step 3: Deploy Frontend

1. **New** → **GitHub Repo** → same repo (add as another service)
2. Select the frontend service → **Settings**:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. **Variables** → add:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.railway.app` (from Step 2)
4. **Settings** → **Networking** → **Generate Domain**
5. Go back to **Backend** → **Variables** → set `CORS_ORIGINS` to your frontend URL (e.g. `https://frontend-xxx.railway.app`)

### Step 4: Redeploy Backend

Redeploy the backend once `CORS_ORIGINS` is set so it accepts requests from the frontend.

### Optional: pgvector for RAG

If you use vector embeddings in PostgreSQL, Railway PostgreSQL supports `pgvector`. Enable it in the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

(Connect via Railway’s database UI or any Postgres client using `DATABASE_URL`.)

---

### Post-Deploy: Run Migrations (Backend Already Running)

If you skipped migrations to get the backend up, run them from your machine:

**Step 1:** Get `DATABASE_URL` from Railway
1. Open your project on [railway.app](https://railway.app)
2. Click **Postgres** service → **Variables** tab
3. Copy the value of `DATABASE_URL` (click to reveal, then copy)
4. For external connections, use **DATABASE_PUBLIC_URL** if shown, or add `?sslmode=require` to the URL

**Step 2:** Run migrations locally
```powershell
cd backend
$env:DATABASE_URL = "postgresql://user:pass@host:port/dbname?sslmode=require"
alembic upgrade head
```
Replace the URL with your actual Railway Postgres URL.

**Step 3:** Verify — Visit `/docs`, try `POST /auth/login` or `GET /customers`. If tables exist, you get a proper response (not 500).

---

### Post-Deploy: Deploy Frontend (Step-by-Step)

**Step 1:** Add frontend service on Railway
1. In your Railway project, click **+ New** → **GitHub Repo**
2. Select the same repo (PulseMetrics)
3. Railway creates a new service

**Step 2:** Configure the frontend service
1. Click the new service
2. **Settings** → **Root Directory:** `frontend`
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`

**Step 3:** Add environment variable
1. **Variables** tab → **+ New Variable**
2. Name: `NEXT_PUBLIC_API_URL`
3. Value: `https://pulsemetrics-production.up.railway.app`
4. Save

**Step 4:** Generate public URL
1. **Settings** → **Networking** → **Generate Domain**
2. Note the URL (e.g. `https://xxx.up.railway.app`)

**Step 5:** Update backend CORS
1. Click **PulseMetrics** (backend) service
2. **Variables** → edit `CORS_ORIGINS`
3. Add your frontend URL: `https://xxx.up.railway.app` (from Step 4)
4. Save — backend redeploys automatically

**Step 6:** Open your frontend URL in a browser and test

---

## Deploy to AWS

### Cheap Demo Option (~$0–10/month)

Best for demos: Amplify (frontend, free) + EC2 t2.micro or Lightsail (backend + PostgreSQL).

**Architecture:**
- **Frontend:** AWS Amplify Hosting (free tier: 1000 build min, 15GB transfer/month)
- **Backend + DB:** Single EC2 t2.micro (750 hrs free for 12 months) or Lightsail $5, running Docker Compose

#### Deploy Backend + PostgreSQL (EC2 or Lightsail)

1. Launch Amazon Linux 2 t2.micro (EC2) or $5 Linux instance (Lightsail)
2. Install Docker and Docker Compose on the instance
3. Clone the repo and run:
   ```bash
   docker-compose up -d
   ```
4. Run migrations: `docker-compose exec backend alembic upgrade head`
5. Configure security group / firewall: allow ports 22 (SSH), 8000 (API)
6. Set environment variables in `.env` or docker-compose:
   - `DATABASE_URL` (from docker-compose: `postgresql://founder:PASSWORD@postgres:5432/founderdashboard`)
   - `JWT_SECRET_KEY` (strong random secret)
   - `CORS_ORIGINS` = your Amplify app URL, e.g. `https://main.xxx.amplifyapp.com`
   - Optional: `OPENAI_API_KEY` or `GROQ_API_KEY` for AI features

#### Deploy Frontend to Amplify

1. AWS Amplify Console → New app → Host web app
2. Connect Git repository, set root directory to `frontend`
3. Build settings (auto-detected for Next.js): `npm run build`
4. Environment variable: `NEXT_PUBLIC_API_URL` = `http://<EC2-or-Lightsail-IP>:8000`
5. Deploy. Amplify provides a URL like `https://main.xxx.amplifyapp.com`

**Note:** Frontend (HTTPS) calling backend (HTTP) may trigger mixed-content warnings in some browsers. For production, add HTTPS to the backend (e.g. reverse proxy with Let's Encrypt).

**Cost:** $0 (free tier) or $5–10/month after free tier.

---

### Option A: Elastic Beanstalk

1. Create a Python environment
2. Deploy the backend folder
3. Configure RDS for PostgreSQL
4. Set environment variables

### Option B: ECS/Fargate

1. Build Docker image from the project
2. Push to ECR
3. Create ECS service with the image
4. Use RDS for PostgreSQL

## Database Migrations

Run migrations before starting the backend:

```bash
cd backend
alembic upgrade head
```

To create a new migration:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## ML Model Training

To pre-train the revenue prediction model (optional):

```bash
cd ml_models
python train.py --user-id <uuid>   # From database
# Or with CSV:
python train.py --csv path/to/orders.csv
```
