# AI Founder Dashboard

A production-ready SaaS dashboard for startup founders to track customers, orders, revenue, and receive AI-powered insights and predictions.

## Features

- **Authentication**: Signup, login, JWT
- **Dashboard**: KPIs, revenue/orders charts, top products, recent activity
- **Customer Management**: CRUD, search, pagination, order history, CSV upload
- **Order Management**: Create orders, filter by date, CSV upload
- **AI Insights**: Generate natural language business summaries
- **Sales Predictions**: ML-based revenue forecasting (next 30 days)
- **Weekly Report**: AI-generated markdown report

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, ShadCN UI, Recharts
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **AI**: OpenAI/Groq compatible LLM, Scikit-learn for predictions

## Quick Start

```bash
# 1. Start database
docker-compose up -d postgres

# 2. Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # Edit DATABASE_URL and JWT_SECRET_KEY
alembic upgrade head
python run.py
# Or: uvicorn app.main:app --reload --port 8000  (omit --reload on Windows if hot-reload fails)

# 3. Frontend (new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open http://localhost:3000

## Documentation

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.
