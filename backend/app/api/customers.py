from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
import csv
import io

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerDetailResponse,
    CustomerOrderSummary,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers(
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Customer).filter(Customer.user_id == current_user.id)
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search),
                Customer.email.ilike(search),
                Customer.company.ilike(search),
            )
        )
    total = query.count()
    offset = (page - 1) * limit
    customers = query.order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()

    return CustomerListResponse(
        items=[
            CustomerResponse(
                id=str(c.id),
                name=c.name,
                email=c.email,
                phone=c.phone or "",
                company=c.company or "",
                total_purchases=c.total_purchases,
                last_purchase_date=c.last_purchase_date,
                created_at=c.created_at,
            )
            for c in customers
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = Customer(
        user_id=current_user.id,
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        company=customer_in.company,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        phone=customer.phone or "",
        company=customer.company or "",
        total_purchases=customer.total_purchases,
        last_purchase_date=customer.last_purchase_date,
        created_at=customer.created_at,
    )


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id == current_user.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders = [
        CustomerOrderSummary(
            id=str(o.id),
            order_id=o.order_id,
            product=o.product,
            price=o.price,
            quantity=o.quantity,
            purchase_date=o.purchase_date,
        )
        for o in sorted(customer.orders, key=lambda x: x.purchase_date, reverse=True)
    ]

    return CustomerDetailResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        phone=customer.phone or "",
        company=customer.company or "",
        total_purchases=customer.total_purchases,
        last_purchase_date=customer.last_purchase_date,
        created_at=customer.created_at,
        orders=orders,
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    customer_in: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id == current_user.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(customer, k, v)
    db.commit()
    db.refresh(customer)
    return CustomerResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        phone=customer.phone or "",
        company=customer.company or "",
        total_purchases=customer.total_purchases,
        last_purchase_date=customer.last_purchase_date,
        created_at=customer.created_at,
    )


@router.post("/upload")
def upload_customers_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk create customers from CSV. Expected columns: name, email, phone, company."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    errors = []

    for i, row in enumerate(reader):
        name = row.get("name", "").strip()
        email = row.get("email", "").strip()
        if not name or not email:
            errors.append(f"Row {i + 2}: name and email required")
            continue
        phone = row.get("phone", "").strip()
        company = row.get("company", "").strip()

        existing = db.query(Customer).filter(
            Customer.user_id == current_user.id,
            Customer.email == email,
        ).first()
        if existing:
            errors.append(f"Row {i + 2}: email {email} already exists")
            continue

        customer = Customer(
            user_id=current_user.id,
            name=name,
            email=email,
            phone=phone,
            company=company,
        )
        db.add(customer)
        created += 1

    db.commit()
    return {"created": created, "errors": errors}


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.user_id == current_user.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None
