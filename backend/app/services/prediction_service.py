"""
ML prediction service - Ridge regression for revenue and order count.
Runs entirely within backend to avoid import/path issues.
"""
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_MODELS_DIR = _BACKEND_ROOT / "models"
_MODELS_DIR.mkdir(exist_ok=True)
REVENUE_MODEL = _MODELS_DIR / "revenue_model.joblib"
REVENUE_SCALER = _MODELS_DIR / "revenue_scaler.joblib"
ORDERS_MODEL = _MODELS_DIR / "orders_model.joblib"
ORDERS_SCALER = _MODELS_DIR / "orders_scaler.joblib"


def _create_features(df: pd.DataFrame, target: str) -> tuple[np.ndarray, np.ndarray]:
    df = df.sort_values("date").reset_index(drop=True)
    df["days_since_start"] = (df["date"] - df["date"].min()).dt.days
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["rolling_7"] = df[target].rolling(7, min_periods=1).mean()
    X = df[["days_since_start", "day_of_week", "day_of_month", "rolling_7"]].fillna(0)
    return X.values, df[target].values


def train_revenue(daily_df: pd.DataFrame) -> None:
    """Train revenue prediction model."""
    if len(daily_df) < 3:
        raise ValueError("Need at least 3 days of data")
    X, y = _create_features(daily_df.copy(), "revenue")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_scaled, y)
    joblib.dump(model, REVENUE_MODEL)
    joblib.dump(scaler, REVENUE_SCALER)


def train_orders(daily_df: pd.DataFrame) -> None:
    """Train order count prediction model."""
    if "order_count" not in daily_df.columns:
        return
    if len(daily_df) < 3:
        raise ValueError("Need at least 3 days of data")
    X, y = _create_features(daily_df.copy(), "order_count")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_scaled, y)
    joblib.dump(model, ORDERS_MODEL)
    joblib.dump(scaler, ORDERS_SCALER)


def predict_revenue(
    last_date: datetime,
    last_days_since_start: int,
    last_rolling_7: float,
    ndays: int = 30,
) -> list[dict]:
    """Predict revenue for next ndays."""
    if not REVENUE_MODEL.exists():
        return []
    model = joblib.load(REVENUE_MODEL)
    scaler = joblib.load(REVENUE_SCALER)
    predictions = []
    rolling = last_rolling_7
    for i in range(1, ndays + 1):
        pred_date = last_date + timedelta(days=i)
        days_since_start = last_days_since_start + i
        X = np.array([[days_since_start, pred_date.weekday(), pred_date.day, rolling]])
        X_scaled = scaler.transform(X)
        pred_revenue = max(0, float(model.predict(X_scaled)[0]))
        rolling = (rolling * 6 + pred_revenue) / 7
        predictions.append({"date": pred_date.strftime("%Y-%m-%d"), "predicted_revenue": round(pred_revenue, 2)})
    return predictions


def predict_orders(
    last_date: datetime,
    last_days_since_start: int,
    last_rolling_7: float,
    ndays: int = 30,
) -> list[dict]:
    """Predict order count for next ndays."""
    if not ORDERS_MODEL.exists():
        return []
    model = joblib.load(ORDERS_MODEL)
    scaler = joblib.load(ORDERS_SCALER)
    predictions = []
    rolling = last_rolling_7
    for i in range(1, ndays + 1):
        pred_date = last_date + timedelta(days=i)
        days_since_start = last_days_since_start + i
        X = np.array([[days_since_start, pred_date.weekday(), pred_date.day, rolling]])
        X_scaled = scaler.transform(X)
        pred_count = max(0, float(model.predict(X_scaled)[0]))
        rolling = (rolling * 6 + pred_count) / 7
        predictions.append({"date": pred_date.strftime("%Y-%m-%d"), "predicted_orders": round(pred_count, 0)})
    return predictions


def _product_slug(name: str) -> str:
    """Safe filename slug from product name."""
    import re
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    slug = re.sub(r"[-\s]+", "_", slug).strip("_") or "product"
    return slug[:50]


def _demand_model_path(product_slug: str) -> Path:
    return _MODELS_DIR / f"demand_{product_slug}.joblib"


def _demand_scaler_path(product_slug: str) -> Path:
    return _MODELS_DIR / f"demand_{product_slug}_scaler.joblib"


def train_product_demand(product_name: str, daily_df: pd.DataFrame) -> None:
    """Train demand (quantity) prediction model for a product."""
    if "quantity" not in daily_df.columns:
        raise ValueError("daily_df must have 'quantity' column")
    if len(daily_df) < 3:
        raise ValueError("Need at least 3 days of data")
    slug = _product_slug(product_name)
    X, y = _create_features(daily_df.copy(), "quantity")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X_scaled, y)
    joblib.dump(model, _demand_model_path(slug))
    joblib.dump(scaler, _demand_scaler_path(slug))


def predict_product_demand(
    product_name: str,
    last_date: datetime,
    last_days_since_start: int,
    last_rolling_7: float,
    ndays: int = 30,
) -> list[dict]:
    """Predict quantity demand for a product for next ndays."""
    slug = _product_slug(product_name)
    model_path = _demand_model_path(slug)
    scaler_path = _demand_scaler_path(slug)
    if not model_path.exists() or not scaler_path.exists():
        return []
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    predictions = []
    rolling = last_rolling_7
    for i in range(1, ndays + 1):
        pred_date = last_date + timedelta(days=i)
        days_since_start = last_days_since_start + i
        X = np.array([[days_since_start, pred_date.weekday(), pred_date.day, rolling]])
        X_scaled = scaler.transform(X)
        pred_qty = max(0, float(model.predict(X_scaled)[0]))
        rolling = (rolling * 6 + pred_qty) / 7
        predictions.append({"date": pred_date.strftime("%Y-%m-%d"), "predicted_quantity": round(pred_qty, 1)})
    return predictions
