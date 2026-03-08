FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Build context is project root - copy backend
# Note: ml_models is optional (standalone CLI); backend uses app/services/prediction_service
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV PYTHONPATH=/app
ENV PORT=8000
EXPOSE 8000

# Run migrations then start server. Use $PORT for Railway (falls back to 8000)
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
