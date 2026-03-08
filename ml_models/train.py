"""
Train revenue prediction model from order data.
Can load from DB or CSV.
"""
import os
import sys
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
import joblib

# Add backend to path for DB access (when loading from DB)
_backend = Path(__file__).parent.parent / "backend"
if _backend.exists() and str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "revenue_model.joblib"
SCALER_PATH = MODEL_DIR / "revenue_scaler.joblib"
ORDERS_MODEL_PATH = MODEL_DIR / "orders_model.joblib"
ORDERS_SCALER_PATH = MODEL_DIR / "orders_scaler.joblib"


def load_from_db(user_id: str = None) -> pd.DataFrame:
    """Load order data from database. Returns daily revenue + order_count."""
    from sqlalchemy import create_engine, text
    from app.core.config import get_settings

    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)

    query = """
    SELECT purchase_date, price, quantity
    FROM orders
    """
    if user_id:
        query += f" WHERE user_id = '{user_id}'"
    query += " ORDER BY purchase_date"

    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)

    df["purchase_date"] = pd.to_datetime(df["purchase_date"])
    df["revenue"] = df["price"] * df["quantity"]
    df["date"] = df["purchase_date"].dt.date
    daily = df.groupby("date").agg(revenue=("revenue", "sum"), order_count=("purchase_date", "count")).reset_index()
    daily["date"] = pd.to_datetime(daily["date"])
    return daily


def load_from_csv(path: str) -> pd.DataFrame:
    """Load from CSV with columns: purchase_date, price, quantity."""
    df = pd.read_csv(path)
    df["purchase_date"] = pd.to_datetime(df["purchase_date"])
    df["revenue"] = df["price"] * df["quantity"]
    df["date"] = df["purchase_date"].dt.date
    daily = df.groupby("date").agg(revenue=("revenue", "sum"), order_count=("purchase_date", "count")).reset_index()
    daily["date"] = pd.to_datetime(daily["date"])
    return daily


def create_features(df: pd.DataFrame, target: str = "revenue") -> tuple[np.ndarray, np.ndarray]:
    """Create features for regression. target: 'revenue' or 'order_count'."""
    df = df.sort_values("date").reset_index(drop=True)
    df["days_since_start"] = (df["date"] - df["date"].min()).dt.days
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["rolling_7"] = df[target].rolling(7, min_periods=1).mean()

    X = df[["days_since_start", "day_of_week", "day_of_month", "rolling_7"]].fillna(0)
    y = df[target].values
    return X.values, y


def train(daily_df: pd.DataFrame) -> None:
    """Train and save model."""
    if len(daily_df) < 3:
        raise ValueError("Need at least 3 days of data to train")

    X, y = create_features(daily_df.copy())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_scaled, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Model saved to {MODEL_PATH}")


def train_orders(daily_df: pd.DataFrame) -> None:
    """Train and save order count prediction model."""
    if "order_count" not in daily_df.columns:
        daily_df["order_count"] = 1  # fallback if only revenue
    if len(daily_df) < 3:
        raise ValueError("Need at least 3 days of data to train")

    X, y = create_features(daily_df.copy(), target="order_count")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_scaled, y)

    joblib.dump(model, ORDERS_MODEL_PATH)
    joblib.dump(scaler, ORDERS_SCALER_PATH)
    print(f"Orders model saved to {ORDERS_MODEL_PATH}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", help="Path to CSV file")
    parser.add_argument("--user-id", help="User ID for DB load")
    args = parser.parse_args()

    if args.csv:
        daily = load_from_csv(args.csv)
    else:
        daily = load_from_db(args.user_id)

    train(daily)
    if "order_count" in daily.columns:
        train_orders(daily)
