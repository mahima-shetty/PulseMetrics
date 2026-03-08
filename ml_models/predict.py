"""
Predict next N days revenue using trained model.
"""
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import joblib

MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "revenue_model.joblib"
SCALER_PATH = MODEL_DIR / "revenue_scaler.joblib"
ORDERS_MODEL_PATH = MODEL_DIR / "orders_model.joblib"
ORDERS_SCALER_PATH = MODEL_DIR / "orders_scaler.joblib"


def predict(
    last_date: datetime,
    last_days_since_start: int,
    last_rolling_7: float,
    ndays: int = 30,
) -> list[dict]:
    """Predict revenue for next ndays."""
    if not MODEL_PATH.exists():
        return []

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    predictions = []
    rolling = last_rolling_7

    for i in range(1, ndays + 1):
        pred_date = last_date + timedelta(days=i)
        days_since_start = last_days_since_start + i
        day_of_week = pred_date.weekday()
        day_of_month = pred_date.day

        X = np.array([[days_since_start, day_of_week, day_of_month, rolling]])
        X_scaled = scaler.transform(X)
        pred_revenue = max(0, float(model.predict(X_scaled)[0]))
        rolling = (rolling * 6 + pred_revenue) / 7  # update rolling avg

        predictions.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "predicted_revenue": round(pred_revenue, 2),
        })

    return predictions


def predict_orders(
    last_date: datetime,
    last_days_since_start: int,
    last_rolling_7: float,
    ndays: int = 30,
) -> list[dict]:
    """Predict order count for next ndays using Ridge regression model."""
    if not ORDERS_MODEL_PATH.exists():
        return []

    model = joblib.load(ORDERS_MODEL_PATH)
    scaler = joblib.load(ORDERS_SCALER_PATH)

    predictions = []
    rolling = last_rolling_7

    for i in range(1, ndays + 1):
        pred_date = last_date + timedelta(days=i)
        days_since_start = last_days_since_start + i
        day_of_week = pred_date.weekday()
        day_of_month = pred_date.day

        X = np.array([[days_since_start, day_of_week, day_of_month, rolling]])
        X_scaled = scaler.transform(X)
        pred_count = max(0, float(model.predict(X_scaled)[0]))
        rolling = (rolling * 6 + pred_count) / 7

        predictions.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "predicted_orders": round(pred_count, 0),
        })

    return predictions
