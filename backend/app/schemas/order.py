from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class OrderBase(BaseModel):
    product: str
    price: float
    quantity: int = 1
    purchase_date: datetime


class OrderCreate(OrderBase):
    customer_id: str


class OrderResponse(OrderBase):
    id: str
    order_id: str
    customer_id: str
    customer_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    limit: int
