from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import csv
import io

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderResponse, OrderListResponse

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_next_order_id(db: Session, user_id: UUID, offset: int = 0) -> str:
    last = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).first()
    if not last:
        return f"ORD-{1 + offset:03d}"
    try:
        num = int(last.order_id.split("-")[1])
        return f"ORD-{num + 1 + offset:03d}"
    except (IndexError, ValueError):
        return f"ORD-{1 + offset:03d}"


@router.get("", response_model=OrderListResponse)
def list_orders(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    customer_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Order).filter(Order.user_id == current_user.id)
    if date_from:
        query = query.filter(Order.purchase_date >= date_from)
    if date_to:
        query = query.filter(Order.purchase_date <= date_to)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    total = query.count()
    offset = (page - 1) * limit
    orders = query.order_by(Order.purchase_date.desc()).offset(offset).limit(limit).all()

    return OrderListResponse(
        items=[
            OrderResponse(
                id=str(o.id),
                order_id=o.order_id,
                customer_id=str(o.customer_id),
                customer_name=o.customer.name if o.customer else None,
                product=o.product,
                price=o.price,
                quantity=o.quantity,
                purchase_date=o.purchase_date,
                created_at=o.created_at,
            )
            for o in orders
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == UUID(order_in.customer_id),
        Customer.user_id == current_user.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    order_id = _get_next_order_id(db, current_user.id)
    total = order_in.price * order_in.quantity

    order = Order(
        user_id=current_user.id,
        customer_id=customer.id,
        order_id=order_id,
        product=order_in.product,
        price=order_in.price,
        quantity=order_in.quantity,
        purchase_date=order_in.purchase_date,
    )
    db.add(order)

    customer.total_purchases = (customer.total_purchases or 0) + total
    customer.last_purchase_date = order_in.purchase_date

    db.commit()
    db.refresh(order)
    return OrderResponse(
        id=str(order.id),
        order_id=order.order_id,
        customer_id=str(order.customer_id),
        customer_name=customer.name,
        product=order.product,
        price=order.price,
        quantity=order.quantity,
        purchase_date=order.purchase_date,
        created_at=order.created_at,
    )


@router.post("/upload")
def upload_orders_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk create orders from CSV. Columns: customer_email, product, price, quantity, purchase_date (YYYY-MM-DD)."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    errors = []

    for i, row in enumerate(reader):
        email = row.get("customer_email", row.get("email", "")).strip()
        product = row.get("product", "").strip()
        try:
            price = float(row.get("price", 0))
            quantity = int(row.get("quantity", 1))
        except (ValueError, TypeError):
            errors.append(f"Row {i + 2}: invalid price or quantity")
            continue
        date_str = row.get("purchase_date", row.get("date", "")).strip()

        if not email or not product:
            errors.append(f"Row {i + 2}: customer_email and product required")
            continue

        try:
            purchase_date = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            errors.append(f"Row {i + 2}: invalid date format (use YYYY-MM-DD)")
            continue

        customer = db.query(Customer).filter(
            Customer.user_id == current_user.id,
            Customer.email == email,
        ).first()
        if not customer:
            errors.append(f"Row {i + 2}: customer {email} not found")
            continue

        order_id = _get_next_order_id(db, current_user.id, offset=created)
        total = price * quantity

        order = Order(
            user_id=current_user.id,
            customer_id=customer.id,
            order_id=order_id,
            product=product,
            price=price,
            quantity=quantity,
            purchase_date=purchase_date,
        )
        db.add(order)
        customer.total_purchases = (customer.total_purchases or 0) + total
        customer.last_purchase_date = purchase_date
        created += 1

    db.commit()
    return {"created": created, "errors": errors}


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(
        id=str(order.id),
        order_id=order.order_id,
        customer_id=str(order.customer_id),
        customer_name=order.customer.name if order.customer else None,
        product=order.product,
        price=order.price,
        quantity=order.quantity,
        purchase_date=order.purchase_date,
        created_at=order.created_at,
    )
