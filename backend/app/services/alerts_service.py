"""
Smart alerts: predefined rules that fire when thresholds are breached.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.customer import Customer
from app.models.order import Order


def get_alerts(
    db: Session,
    user_id: UUID,
    revenue_drop_pct: float = 30,
    inactive_days: int = 60,
) -> list[dict]:
    """
    Run predefined alert rules. Returns list of { id, type, message, severity, data }.
    """
    alerts = []
    now = datetime.now(timezone.utc)

    # Rule 1: Revenue drop week-over-week > threshold%
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    this_week_rev = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= this_week_start,
        )
        .scalar()
    ) or 0.0

    last_week_rev = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= last_week_start,
            Order.purchase_date < this_week_start,
        )
        .scalar()
    ) or 0.0

    if last_week_rev > 0:
        drop_pct = ((last_week_rev - this_week_rev) / last_week_rev) * 100
        if drop_pct >= revenue_drop_pct:
            alerts.append({
                "id": "revenue_drop",
                "type": "revenue_drop",
                "message": f"Revenue down {drop_pct:.0f}% vs last week (${this_week_rev:,.0f} vs ${last_week_rev:,.0f})",
                "severity": "high" if drop_pct >= 50 else "medium",
                "data": {"this_week": float(this_week_rev), "last_week": float(last_week_rev), "drop_pct": round(drop_pct, 1)},
            })

    # Rule 2: High-value customers inactive > N days
    cutoff = now - timedelta(days=inactive_days)
    high_value_threshold = 500  # Consider "high value" if total_purchases > 500

    inactive_high = (
        db.query(Customer)
        .filter(
            Customer.user_id == user_id,
            Customer.total_purchases >= high_value_threshold,
            or_(
                Customer.last_purchase_date.is_(None),
                Customer.last_purchase_date < cutoff,
            ),
        )
        .all()
    )

    if inactive_high:
        names = [c.name for c in inactive_high[:5]]
        total_val = sum(c.total_purchases for c in inactive_high)
        alerts.append({
            "id": "inactive_high_value",
            "type": "inactive_high_value",
            "message": f"{len(inactive_high)} high-value customer(s) inactive > {inactive_days} days (${total_val:,.0f} at risk)",
            "severity": "high" if len(inactive_high) >= 3 else "medium",
            "data": {"count": len(inactive_high), "names": names, "total_at_risk": total_val},
        })

    # Rule 3: Order count drop vs 7d rolling avg
    last_7d_orders = (
        db.query(func.count(Order.id))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= now - timedelta(days=7),
        )
        .scalar()
    ) or 0

    prev_7d_orders = (
        db.query(func.count(Order.id))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= now - timedelta(days=14),
            Order.purchase_date < now - timedelta(days=7),
        )
        .scalar()
    ) or 0

    if prev_7d_orders > 0:
        order_drop = ((prev_7d_orders - last_7d_orders) / prev_7d_orders) * 100
        if order_drop >= 30:
            alerts.append({
                "id": "order_drop",
                "type": "order_drop",
                "message": f"Orders down {order_drop:.0f}% vs prior 7 days ({last_7d_orders} vs {prev_7d_orders})",
                "severity": "medium",
                "data": {"this_week": last_7d_orders, "last_week": prev_7d_orders, "drop_pct": round(order_drop, 1)},
            })

    return alerts
