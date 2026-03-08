"""
Period-over-period comparison: this month vs last month, this week vs last week.
"""
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.order import Order


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def get_period_comparison(db: Session, user_id: UUID, mode: str = "month") -> dict:
    """
    Compare current period vs previous period.
    mode: "month" (this month vs last month) or "week" (this week vs last week)
    """
    now = datetime.utcnow()
    if mode == "week":
        # This week: Monday 00:00 to now
        days_since_monday = now.weekday()
        this_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = this_start - timedelta(days=7)
        prev_end = this_start
        period_label = "week"
    else:
        # This month vs last month
        this_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = this_start - timedelta(days=1)
        prev_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_end = this_start
        period_label = "month"

    # Revenue
    this_rev = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(Order.user_id == user_id, Order.purchase_date >= this_start)
        .scalar()
    ) or 0.0
    prev_rev = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= prev_start,
            Order.purchase_date < prev_end,
        )
        .scalar()
    ) or 0.0

    # Orders
    this_orders = (
        db.query(func.count(Order.id))
        .filter(Order.user_id == user_id, Order.purchase_date >= this_start)
        .scalar()
    ) or 0
    prev_orders = (
        db.query(func.count(Order.id))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= prev_start,
            Order.purchase_date < prev_end,
        )
        .scalar()
    ) or 0

    # New customers (created in period)
    this_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.user_id == user_id, Customer.created_at >= this_start)
        .scalar()
    ) or 0
    prev_customers = (
        db.query(func.count(Customer.id))
        .filter(
            Customer.user_id == user_id,
            Customer.created_at >= prev_start,
            Customer.created_at < prev_end,
        )
        .scalar()
    ) or 0

    return {
        "mode": mode,
        "period_label": period_label,
        "this_period_start": this_start.isoformat(),
        "prev_period_start": prev_start.isoformat(),
        "prev_period_end": prev_end.isoformat(),
        "revenue": {
            "this": float(this_rev),
            "prev": float(prev_rev),
            "change_pct": _pct_change(float(this_rev), float(prev_rev)),
        },
        "orders": {
            "this": int(this_orders),
            "prev": int(prev_orders),
            "change_pct": _pct_change(float(this_orders), float(prev_orders)),
        },
        "new_customers": {
            "this": int(this_customers),
            "prev": int(prev_customers),
            "change_pct": _pct_change(float(this_customers), float(prev_customers)),
        },
    }
