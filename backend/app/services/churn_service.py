"""
Churn / at-risk customer scoring based on recency, frequency, and monetary value.
"""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.order import Order


def get_at_risk_customers(db: Session, user_id: UUID, inactive_days: int = 60) -> list[dict]:
    """
    Return customers sorted by churn risk (0-100, higher = more at risk).
    Risk increases with: days since last order, high past spend (lost value).
    """
    rows = (
        db.query(
            Customer.id,
            Customer.name,
            Customer.email,
            Customer.total_purchases,
            Customer.last_purchase_date,
            func.count(Order.id).label("order_count"),
        )
        .outerjoin(Order, Order.customer_id == Customer.id)
        .filter(Customer.user_id == user_id)
        .group_by(Customer.id, Customer.name, Customer.email, Customer.total_purchases, Customer.last_purchase_date)
        .all()
    )

    now = datetime.now(timezone.utc)
    candidates = []
    for r in rows:
        if not r.last_purchase_date:
            recency_days = 999
        else:
            dt = r.last_purchase_date
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            recency_days = (now - dt).days

        if recency_days < inactive_days:
            continue  # Still active, skip

        monetary = float(r.total_purchases) if r.total_purchases else 0.0
        frequency = int(r.order_count) if r.order_count else 0

        # Risk score: higher recency + higher monetary = higher risk
        # recency contributes up to 50 pts (0-90+ days maps to 0-50)
        # monetary contributes up to 50 pts (relative to max in batch)
        recency_score = min(50, (recency_days - inactive_days) / 2)
        candidates.append({
            "id": str(r.id),
            "name": r.name,
            "email": r.email,
            "days_since_order": recency_days,
            "last_purchase_date": r.last_purchase_date.isoformat() if r.last_purchase_date else None,
            "order_count": frequency,
            "total_purchases": monetary,
            "recency_score": recency_score,
        })

    if not candidates:
        return []

    max_monetary = max(c["total_purchases"] for c in candidates) or 1
    for c in candidates:
        monetary_score = (c["total_purchases"] / max_monetary) * 50
        c["score"] = min(100, round(c["recency_score"] + monetary_score, 1))
        if c["total_purchases"] >= max_monetary * 0.5 and c["days_since_order"] >= inactive_days * 1.5:
            c["reason"] = "High-value customer inactive for extended period"
        elif c["days_since_order"] >= inactive_days * 2:
            c["reason"] = "No orders for 2x threshold period"
        elif c["total_purchases"] > 0:
            c["reason"] = f"Inactive {c['days_since_order']} days, previously spent ${c['total_purchases']:,.0f}"
        else:
            c["reason"] = f"Inactive {c['days_since_order']} days"
        del c["recency_score"]

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates
