from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.dashboard_service import (
    get_kpis,
    get_revenue_chart,
    get_orders_chart,
    get_top_products,
    get_recent_orders,
    get_recent_customers,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
def dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_kpis(db, current_user.id)


@router.get("/revenue-chart")
def revenue_chart(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_revenue_chart(db, current_user.id, days)


@router.get("/orders-chart")
def orders_chart(
    days: int = Query(14, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_orders_chart(db, current_user.id, days)


@router.get("/top-products")
def top_products(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_top_products(db, current_user.id, limit)


@router.get("/recent-orders")
def recent_orders(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = get_recent_orders(db, current_user.id, limit)
    return [
        {
            "id": str(o.id),
            "order_id": o.order_id,
            "product": o.product,
            "price": o.price,
            "quantity": o.quantity,
            "total": o.price * o.quantity,
            "purchase_date": o.purchase_date.isoformat(),
            "customer_name": o.customer.name if o.customer else None,
        }
        for o in orders
    ]


@router.get("/recent-customers")
def recent_customers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customers = get_recent_customers(db, current_user.id, limit)
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "company": c.company or "",
            "total_purchases": c.total_purchases,
            "created_at": c.created_at.isoformat(),
        }
        for c in customers
    ]
