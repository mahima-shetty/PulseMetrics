from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.customer import Customer
from app.services.dashboard_service import get_kpis, get_top_products, get_revenue_chart
from app.services.llm_service import generate_insights

router = APIRouter(prefix="/ai-insights", tags=["ai-insights"])


@router.post("/generate")
async def generate_ai_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI business insights from current metrics."""
    try:
        kpis = get_kpis(db, current_user.id)
        top_products = get_top_products(db, current_user.id, 10)
        revenue_data = get_revenue_chart(db, current_user.id, 30)

        # Customer stats
        total_customers = kpis["total_customers"]
        total_revenue = kpis["total_revenue"]
        avg_per_customer = total_revenue / total_customers if total_customers else 0

        metrics = {
            "kpis": kpis,
            "top_products": top_products,
            "revenue_trend": revenue_data[-7:] if len(revenue_data) >= 7 else revenue_data,
            "avg_revenue_per_customer": round(avg_per_customer, 2),
        }

        insights = await generate_insights(metrics)
        return {"insights": insights, "metrics": metrics}
    except Exception as e:
        import logging
        logging.exception("AI insights generation failed")
        return {"insights": f"Failed to generate insights: {str(e)}", "metrics": {}}
