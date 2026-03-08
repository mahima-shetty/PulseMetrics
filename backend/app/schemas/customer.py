from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str = ""
    company: str = ""


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: str
    total_purchases: float
    last_purchase_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    limit: int


class CustomerOrderSummary(BaseModel):
    id: str
    order_id: str
    product: str
    price: float
    quantity: int
    purchase_date: datetime


class CustomerDetailResponse(CustomerResponse):
    orders: list[CustomerOrderSummary] = []
