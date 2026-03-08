from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.customer import Customer
from app.services.dashboard_service import get_kpis, get_top_products
from app.services.llm_service import generate_weekly_report

router = APIRouter(prefix="/weekly-report", tags=["weekly-report"])


@router.post("")
async def create_weekly_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate automated weekly business report."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Revenue last 7 days
    week_revenue = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == current_user.id,
            Order.purchase_date >= week_ago,
        )
        .scalar()
    ) or 0.0

    # Orders last 7 days
    week_orders = (
        db.query(Order).filter(
            Order.user_id == current_user.id,
            Order.purchase_date >= week_ago,
        ).count()
    )

    # New customers last 7 days
    new_customers = (
        db.query(Customer).filter(
            Customer.user_id == current_user.id,
            Customer.created_at >= week_ago,
        ).count()
    )

    kpis = get_kpis(db, current_user.id)
    top_products = get_top_products(db, current_user.id, 5)

    report_data = {
        "period": {"from": week_ago.isoformat(), "to": now.isoformat()},
        "weekly": {
            "revenue": float(week_revenue),
            "orders": week_orders,
            "new_customers": new_customers,
        },
        "totals": kpis,
        "top_products": top_products,
    }

    report_md = await generate_weekly_report(report_data)
    return {
        "report": report_md,
        "format": "markdown",
        "generated_at": now.isoformat(),
    }
