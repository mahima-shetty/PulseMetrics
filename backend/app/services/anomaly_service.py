"""
Anomaly detection for daily revenue and order count using z-score / rolling statistics.
"""
from datetime import datetime, timedelta
from uuid import UUID

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.order import Order


def get_daily_series(db: Session, user_id: UUID, days: int) -> pd.DataFrame:
    """Get daily revenue and order count DataFrame."""
    start = datetime.utcnow() - timedelta(days=days)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date(Order.purchase_date).label("date"),
            func.sum(Order.price * Order.quantity).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(Order.user_id == user_id, Order.purchase_date >= start)
        .group_by(func.date(Order.purchase_date))
        .order_by(func.date(Order.purchase_date))
        .all()
    )

    df = pd.DataFrame([
        {"date": r.date, "revenue": float(r.revenue), "orders": r.count}
        for r in rows
    ])
    if df.empty:
        return pd.DataFrame()

    df["date"] = pd.to_datetime(df["date"])
    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    df = df.set_index("date").reindex(full_range, fill_value=0).reset_index()
    df = df.rename(columns={"index": "date"})
    df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0).astype(float)
    df["orders"] = pd.to_numeric(df["orders"], errors="coerce").fillna(0).astype(int)
    return df


def detect_anomalies(db: Session, user_id: UUID, days: int = 30, std_threshold: float = 2.0) -> list[dict]:
    """
    Detect days with significant drops in revenue or orders.
    Uses rolling mean and std; flags when actual < mean - threshold*std.
    """
    df = get_daily_series(db, user_id, days)
    if len(df) < 7:
        return []

    anomalies = []
    window = 7

    for col, typ in [("revenue", "revenue"), ("orders", "orders")]:
        s = df[col]
        rolling_mean = s.rolling(window, min_periods=3).mean()
        rolling_std = s.rolling(window, min_periods=3).std().fillna(0)

        for i in range(window, len(df)):
            actual = float(s.iloc[i])
            expected = float(rolling_mean.iloc[i])
            std_val = float(rolling_std.iloc[i])

            if std_val <= 0 or expected <= 0:
                continue

            # Flag significant drop (actual well below expected)
            if actual < expected - std_threshold * std_val and expected > 0:
                deviation_pct = ((expected - actual) / expected) * 100 if expected else 0
                anomalies.append({
                    "date": df["date"].iloc[i].strftime("%Y-%m-%d"),
                    "type": typ,
                    "actual": round(actual, 2) if typ == "revenue" else int(actual),
                    "expected": round(expected, 2) if typ == "revenue" else round(expected, 1),
                    "deviation_pct": round(deviation_pct, 1),
                })

    anomalies.sort(key=lambda x: (x["date"], x["type"]))
    return anomalies
