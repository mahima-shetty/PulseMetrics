"""
Customer Lifetime Value (LTV) prediction.
Simple extrapolation: historical spend rate * future period.
"""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.order import Order


def get_ltv_predictions(db: Session, user_id: UUID, limit: int = 50) -> list[dict]:
    """
    Return customers with historical and predicted LTV (6m, 12m).
    Predicted = historical spend rate extrapolated over future period.
    """
    now = datetime.now(timezone.utc)

    # Get per-customer: total spend, order count, first order date
    rows = (
        db.query(
            Customer.id,
            Customer.name,
            Customer.email,
            Customer.total_purchases,
            func.count(Order.id).label("order_count"),
            func.min(Order.purchase_date).label("first_order_date"),
        )
        .outerjoin(Order, Order.customer_id == Customer.id)
        .filter(Customer.user_id == user_id)
        .group_by(Customer.id, Customer.name, Customer.email, Customer.total_purchases)
        .all()
    )

    result = []
    for r in rows:
        historical = float(r.total_purchases) if r.total_purchases else 0.0
        order_count = int(r.order_count) if r.order_count else 0

        if not r.first_order_date:
            past_months = 0.1  # Avoid div by zero
        else:
            dt = r.first_order_date
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            tenure_days = (now - dt).days
            past_months = max(0.1, tenure_days / 30.0)

        # Predicted LTV = historical rate * future months
        monthly_rate = historical / past_months if past_months > 0 else 0
        predicted_6m = round(monthly_rate * 6, 2)
        predicted_12m = round(monthly_rate * 12, 2)

        result.append({
            "id": str(r.id),
            "name": r.name,
            "email": r.email,
            "historical_ltv": round(historical, 2),
            "order_count": order_count,
            "predicted_ltv_6m": predicted_6m,
            "predicted_ltv_12m": predicted_12m,
        })

    # Sort by predicted 12m LTV descending
    result.sort(key=lambda x: x["predicted_ltv_12m"], reverse=True)
    return result[:limit]
