"""
Customer segmentation using RFM (Recency, Frequency, Monetary) + K-means.
"""
from datetime import datetime, timezone
from uuid import UUID

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.order import Order
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

SEGMENT_NAMES = ["Champions", "Loyal", "At-Risk", "Lost"]


def get_rfm_data(db: Session, user_id: UUID) -> pd.DataFrame:
    """Build RFM DataFrame per customer."""
    rows = (
        db.query(
            Customer.id,
            Customer.name,
            Customer.email,
            Customer.total_purchases.label("monetary"),
            Customer.last_purchase_date,
            func.count(Order.id).label("frequency"),
        )
        .outerjoin(Order, Order.customer_id == Customer.id)
        .filter(Customer.user_id == user_id)
        .group_by(Customer.id, Customer.name, Customer.email, Customer.total_purchases, Customer.last_purchase_date)
        .all()
    )

    now = datetime.now(timezone.utc)
    data = []
    for r in rows:
        recency_days = 999
        if r.last_purchase_date:
            delta = now - (r.last_purchase_date if r.last_purchase_date.tzinfo else r.last_purchase_date.replace(tzinfo=timezone.utc))
            recency_days = delta.days
        data.append({
            "customer_id": str(r.id),
            "name": r.name,
            "email": r.email,
            "recency": recency_days,
            "frequency": int(r.frequency) if r.frequency else 0,
            "monetary": float(r.monetary) if r.monetary else 0.0,
        })

    return pd.DataFrame(data)


def compute_segments(db: Session, user_id: UUID) -> list[dict]:
    """
    Compute RFM + K-means segments for customers.
    Returns list of segments with customer lists.
    """
    df = get_rfm_data(db, user_id)
    if len(df) < 2:
        # Too few customers for clustering; assign everyone to one segment
        if len(df) == 1:
            row = df.iloc[0]
            seg_name = "Champions" if row["monetary"] > 0 else "Lost"
            return [{
                "name": seg_name,
                "customer_count": 1,
                "customers": [{
                    "id": row["customer_id"],
                    "name": row["name"],
                    "email": row["email"],
                    "recency": int(row["recency"]),
                    "frequency": int(row["frequency"]),
                    "monetary": round(row["monetary"], 2),
                }],
            }]
        return []

    # For clustering: invert recency so higher = better (recent = good)
    df["recency_score"] = df["recency"].max() - df["recency"] + 1
    if df["recency_score"].max() == df["recency_score"].min():
        df["recency_score"] = 1

    X = df[["recency_score", "frequency", "monetary"]].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = min(4, len(df))
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)

    # Map clusters to segment names by average RFM profile
    # Higher recency_score, frequency, monetary = better segment
    cluster_means = df.groupby("cluster")[["recency_score", "frequency", "monetary"]].mean()
    cluster_means["score"] = (
        cluster_means["recency_score"] * 0.3
        + cluster_means["frequency"].rank(pct=True) * 100 * 0.3
        + cluster_means["monetary"].rank(pct=True) * 100 * 0.4
    )
    rank_map = cluster_means["score"].rank(ascending=False).astype(int) - 1
    cluster_to_segment = {c: SEGMENT_NAMES[min(int(r), 3)] for c, r in rank_map.items()}
    df["segment"] = df["cluster"].map(cluster_to_segment)

    segments_out = []
    for seg in SEGMENT_NAMES:
        sub = df[df["segment"] == seg]
        if len(sub) == 0:
            continue
        segments_out.append({
            "name": seg,
            "customer_count": len(sub),
            "customers": [
                {
                    "id": row["customer_id"],
                    "name": row["name"],
                    "email": row["email"],
                    "recency": int(row["recency"]),
                    "frequency": int(row["frequency"]),
                    "monetary": round(row["monetary"], 2),
                }
                for _, row in sub.iterrows()
            ],
        })

    return segments_out
