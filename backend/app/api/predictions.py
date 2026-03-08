import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order
from app.services.prediction_service import (
    train_revenue,
    train_orders,
    predict_revenue,
    predict_orders,
)

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _get_daily_for_training(db: Session, user_id) -> pd.DataFrame:
    """Get daily revenue + order_count for ML training."""
    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.sum(Order.price * Order.quantity).label("revenue"),
            func.count(Order.id).label("order_count"),
        )
        .filter(Order.user_id == user_id)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )
    df = pd.DataFrame([{"date": r.date, "revenue": float(r.revenue), "order_count": int(r.order_count)} for r in rows])
    df["date"] = pd.to_datetime(df["date"])
    return df


@router.get("/revenue")
def get_revenue_predictions(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get historical revenue + predicted next N days."""
    # Get historical daily revenue
    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.sum(Order.price * Order.quantity).label("revenue"),
        )
        .filter(Order.user_id == current_user.id)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    if len(rows) < 3:
        return {
            "historical": [{"date": str(r.date), "revenue": float(r.revenue)} for r in rows],
            "predicted": [],
            "message": "Need at least 3 days of order data for predictions",
        }

    # Build historical series
    df = pd.DataFrame([{"date": r.date, "revenue": float(r.revenue)} for r in rows])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    df["rolling_7"] = df["revenue"].rolling(7, min_periods=1).mean()

    last_row = df.iloc[-1]
    last_date = last_row["date"]
    if isinstance(last_date, pd.Timestamp):
        last_date = last_date.to_pydatetime()
    last_days_since_start = (df["date"].max() - df["date"].min()).days
    last_rolling_7 = float(last_row["rolling_7"])

    # Train model first if needed, then predict
    predicted = []
    try:
        daily = _get_daily_for_training(db, current_user.id)
        if len(daily) >= 3:
            train_revenue(daily)
        predicted = predict_revenue(
            last_date=last_date,
            last_days_since_start=last_days_since_start,
            last_rolling_7=last_rolling_7,
            ndays=days,
        )
    except Exception as e:
        logger.exception("Revenue prediction failed: %s", e)

    return {
        "historical": [{"date": str(r.date), "revenue": float(r.revenue)} for r in rows],
        "predicted": predicted,
    }


@router.get("/orders")
def get_order_predictions(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get historical order counts + predicted next N days using Ridge regression ML model."""
    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.count(Order.id).label("order_count"),
        )
        .filter(Order.user_id == current_user.id)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    if len(rows) < 3:
        return {
            "historical": [{"date": str(r.date), "order_count": int(r.order_count)} for r in rows],
            "predicted": [],
            "message": "Need at least 3 days of order data for predictions",
        }

    df = pd.DataFrame([{"date": r.date, "order_count": int(r.order_count)} for r in rows])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    df["rolling_7"] = df["order_count"].rolling(7, min_periods=1).mean()

    last_row = df.iloc[-1]
    last_date = last_row["date"]
    if isinstance(last_date, pd.Timestamp):
        last_date = last_date.to_pydatetime()
    last_days_since_start = (df["date"].max() - df["date"].min()).days
    last_rolling_7 = float(last_row["rolling_7"])

    predicted = []
    try:
        daily = _get_daily_for_training(db, current_user.id)
        if len(daily) >= 3:
            train_orders(daily)
        predicted = predict_orders(
            last_date=last_date,
            last_days_since_start=last_days_since_start,
            last_rolling_7=last_rolling_7,
            ndays=days,
        )
    except Exception as e:
        logger.exception("Order prediction failed: %s", e)

    return {
        "historical": [{"date": str(r.date), "order_count": int(r.order_count)} for r in rows],
        "predicted": predicted,
    }


@router.get("/summary")
def get_predictions_summary(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get combined revenue + order predictions for the Predictions tab."""
    rev = get_revenue_predictions(days, current_user, db)
    ords = get_order_predictions(days, current_user, db)
    return {
        "revenue": rev,
        "orders": ords,
        "model_info": {
            "algorithm": "Ridge Regression (sklearn)",
            "features": ["days_since_start", "day_of_week", "day_of_month", "rolling_7d_avg"],
        },
    }
