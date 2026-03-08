from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.auth import router as auth_router
from app.api.customers import router as customers_router
from app.api.orders import router as orders_router
from app.api.dashboard import router as dashboard_router
from app.api.predictions import router as predictions_router
from app.api.ai_insights import router as ai_insights_router
from app.api.weekly_report import router as weekly_report_router
from app.api.seed import router as seed_router
from app.api.segments import router as segments_router
from app.api.at_risk import router as at_risk_router
from app.api.anomalies import router as anomalies_router
from app.api.demand import router as demand_router
from app.api.recommendations import router as recommendations_router
from app.api.ltv import router as ltv_router
from app.api.alerts import router as alerts_router
from app.api.ask import router as ask_router
from app.api.ai_expert import router as ai_expert_router
from app.api.comparison import router as comparison_router

app = FastAPI(
    title="AI Founder Dashboard API",
    description="Backend API for startup founders dashboard",
    version="1.0.0"
)

# CORS - must be first middleware added (outermost). Explicit dev origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(orders_router)
app.include_router(dashboard_router)
app.include_router(predictions_router)
app.include_router(ai_insights_router)
app.include_router(weekly_report_router)
app.include_router(seed_router)
app.include_router(segments_router)
app.include_router(at_risk_router)
app.include_router(anomalies_router)
app.include_router(demand_router)
app.include_router(recommendations_router)
app.include_router(ltv_router)
app.include_router(alerts_router)
app.include_router(ask_router)
app.include_router(ai_expert_router)
app.include_router(comparison_router)


ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}


def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "http://localhost:3000")
    if origin not in ALLOWED_ORIGINS:
        origin = "http://localhost:3000"
    return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Add CORS to HTTP errors (401, 404, etc)."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers(request),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled errors, return 500 with CORS and log."""
    import logging
    logging.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}
