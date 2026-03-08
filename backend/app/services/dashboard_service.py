from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.customer import Customer
from app.models.order import Order


def get_kpis(db: Session, user_id: UUID) -> dict:
    total_revenue = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(Order.user_id == user_id)
        .scalar()
    ) or 0.0

    total_orders = db.query(Order).filter(Order.user_id == user_id).count()
    total_customers = db.query(Customer).filter(Customer.user_id == user_id).count()

    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    this_month_revenue = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= this_month_start,
        )
        .scalar()
    ) or 0.0

    last_month_revenue = (
        db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0))
        .filter(
            Order.user_id == user_id,
            Order.purchase_date >= last_month_start,
            Order.purchase_date < this_month_start,
        )
        .scalar()
    ) or 0.0

    if last_month_revenue > 0:
        monthly_growth = ((this_month_revenue - last_month_revenue) / last_month_revenue) * 100
    else:
        monthly_growth = 100.0 if this_month_revenue > 0 else 0.0

    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "total_customers": total_customers,
        "monthly_growth": round(monthly_growth, 2),
    }


def get_revenue_chart(db: Session, user_id: UUID, days: int = 30) -> list[dict]:
    start = datetime.utcnow() - timedelta(days=days)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.sum(Order.price * Order.quantity).label("revenue"),
        )
        .filter(Order.user_id == user_id, Order.purchase_date >= start)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    return [{"date": str(r.date), "revenue": float(r.revenue)} for r in rows]


def get_orders_chart(db: Session, user_id: UUID, days: int = 14) -> list[dict]:
    start = datetime.utcnow() - timedelta(days=days)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.count(Order.id).label("count"),
        )
        .filter(Order.user_id == user_id, Order.purchase_date >= start)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    return [{"date": str(r.date), "orders": r.count} for r in rows]


def get_top_products(db: Session, user_id: UUID, limit: int = 5) -> list[dict]:
    rows = (
        db.query(
            Order.product,
            func.sum(Order.price * Order.quantity).label("revenue"),
            func.sum(Order.quantity).label("quantity"),
        )
        .filter(Order.user_id == user_id)
        .group_by(Order.product)
        .order_by(func.sum(Order.price * Order.quantity).desc())
        .limit(limit)
        .all()
    )

    return [
        {"product": r.product, "revenue": float(r.revenue), "quantity": int(r.quantity)}
        for r in rows
    ]


def get_recent_orders(db: Session, user_id: UUID, limit: int = 10) -> list:
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.purchase_date.desc())
        .limit(limit)
        .all()
    )
    return orders


def get_recent_customers(db: Session, user_id: UUID, limit: int = 10) -> list:
    customers = (
        db.query(Customer)
        .filter(Customer.user_id == user_id)
        .order_by(Customer.created_at.desc())
        .limit(limit)
        .all()
    )
    return customers
