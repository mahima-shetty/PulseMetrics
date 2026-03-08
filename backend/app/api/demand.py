import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order
from app.services.prediction_service import (
    train_product_demand,
    predict_product_demand,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demand", tags=["demand"])


def _get_daily_product_quantity(db: Session, user_id, product_name: str, days: int) -> pd.DataFrame:
    """Get daily quantity sold for a product."""
    start = datetime.utcnow() - timedelta(days=days)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.sum(Order.quantity).label("quantity"),
        )
        .filter(
            Order.user_id == user_id,
            Order.product == product_name,
            Order.purchase_date >= start,
        )
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    df = pd.DataFrame([{"date": r.date, "quantity": int(r.quantity)} for r in rows])
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    return df


def _get_top_products(db: Session, user_id, limit: int = 10) -> list[str]:
    """Get top products by total quantity sold."""
    rows = (
        db.query(Order.product, func.sum(Order.quantity).label("qty"))
        .filter(Order.user_id == user_id)
        .group_by(Order.product)
        .order_by(func.sum(Order.quantity).desc())
        .limit(limit)
        .all()
    )
    return [r.product for r in rows]


@router.get("")
def get_demand_forecast(
    days: int = Query(30, ge=7, le=90),
    product: str | None = Query(None, description="Specific product; if omitted, returns top products"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get per-product demand forecast (historical + predicted quantity)."""
    products_to_fetch = [product] if product else _get_top_products(db, current_user.id, 10)
    if not products_to_fetch:
        return {"products": []}

    result = []
    lookback = max(days * 2, 60)

    for prod_name in products_to_fetch:
        daily = _get_daily_product_quantity(db, current_user.id, prod_name, lookback)
        if len(daily) < 3:
            result.append({
                "product": prod_name,
                "historical": [{"date": str(r.date), "quantity": int(r.quantity)} for _, r in daily.iterrows()],
                "predicted": [],
                "message": "Need at least 3 days of data",
            })
            continue

        daily = daily.sort_values("date").reset_index(drop=True)
        daily["rolling_7"] = daily["quantity"].rolling(7, min_periods=1).mean()

        last_row = daily.iloc[-1]
        last_date = last_row["date"]
        if isinstance(last_date, pd.Timestamp):
            last_date = last_date.to_pydatetime()
        last_days_since_start = (daily["date"].max() - daily["date"].min()).days
        last_rolling_7 = float(last_row["rolling_7"])

        predicted = []
        try:
            train_product_demand(prod_name, daily)
            predicted = predict_product_demand(
                prod_name,
                last_date=last_date,
                last_days_since_start=last_days_since_start,
                last_rolling_7=last_rolling_7,
                ndays=days,
            )
        except Exception as e:
            logger.exception("Demand prediction failed for %s: %s", prod_name, e)

        historical = [
            {"date": str(r.date), "quantity": int(r.quantity)}
            for _, r in daily.iterrows()
        ]
        result.append({
            "product": prod_name,
            "historical": historical,
            "predicted": predicted,
        })

    return {"products": result}
