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

## Deploy to AWS

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
