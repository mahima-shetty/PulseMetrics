"""
Ask Data: natural language query over dashboard metrics.
LLM maps question to whitelisted query types; we execute and return data.
"""
import json
import re

from app.services.dashboard_service import (
    get_kpis,
    get_revenue_chart,
    get_orders_chart,
    get_top_products,
    get_recent_orders,
    get_recent_customers,
)
from app.services.segmentation_service import compute_segments
from app.services.churn_service import get_at_risk_customers
from app.services.alerts_service import get_alerts
from app.services.recommendations_service import get_recommendations
from app.services.ltv_service import get_ltv_predictions
from app.services.anomaly_service import detect_anomalies


WHITELIST = [
    "kpis", "revenue_chart", "orders_chart", "top_products",
    "recent_orders", "recent_customers",
    "segments", "at_risk", "alerts", "recommendations", "ltv", "anomalies",
]


def _extract_intent_and_params(question: str, llm_func) -> tuple[str, dict]:
    """Use LLM to map question to intent + params. Fallback to heuristics if no LLM or parse fail."""
    q = question.lower().strip()

    # Try LLM first when available
    if llm_func:
        try:
            response = llm_func(question)
            if response:
                data = json.loads(response)
                intent = data.get("intent", "")
                if intent in WHITELIST:
                    params = {k: v for k, v in data.items() if k != "intent" and isinstance(v, (int, float))}
                    # Ensure days/limit are int
                    if "days" in params:
                        params["days"] = min(90, max(7, int(params["days"])))
                    if "limit" in params:
                        params["limit"] = min(50, max(1, int(params["limit"])))
                    return intent, params
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    # Heuristic fallbacks
    if "segment" in q or "rfm" in q:
        return "segments", {}

    if "at risk" in q or "at-risk" in q or "churn" in q or "inactive customer" in q:
        days = 60
        m = re.search(r"(\d+)\s*days?", q)
        if m:
            days = min(365, max(14, int(m.group(1))))
        return "at_risk", {"days": days}

    if "alert" in q or "warning" in q or "issue" in q:
        return "alerts", {}

    if "recommendation" in q or "also bought" in q or "bundle" in q or "cross-sell" in q:
        return "recommendations", {}

    if "ltv" in q or "lifetime value" in q or "predicted value" in q:
        limit = 10
        m = re.search(r"top\s*(\d+)|(\d+)\s*customer", q)
        if m:
            limit = min(50, max(1, int(m.group(1) or m.group(2) or 10)))
        return "ltv", {"limit": limit}

    if "anomal" in q or "unusual" in q or "outlier" in q:
        days = 30
        m = re.search(r"last\s*(\d+)|(\d+)\s*days?", q)
        if m:
            days = min(90, max(7, int(m.group(1) or m.group(2) or 30)))
        return "anomalies", {"days": days}

    # Revenue chart
    if "revenue" in q and ("last" in q or "month" in q or "week" in q or "30" in q or "chart" in q or "trend" in q or "over time" in q):
        days = 30
        if "week" in q or "7" in q:
            days = 7
        if "14" in q:
            days = 14
        if "60" in q or "2 month" in q:
            days = 60
        m = re.search(r"(\d+)\s*days?|last\s*(\d+)", q)
        if m:
            days = min(90, max(7, int(m.group(1) or m.group(2) or days)))
        return "revenue_chart", {"days": days}

    # Sales = revenue
    if "sales" in q and ("over time" in q or "trend" in q or "last" in q or "chart" in q):
        days = 30
        m = re.search(r"(\d+)\s*days?|last\s*(\d+)", q)
        if m:
            days = min(90, max(7, int(m.group(1) or m.group(2) or days)))
        return "revenue_chart", {"days": days}

    # Orders chart
    if "order" in q and ("last" in q or "chart" in q or "trend" in q or "over time" in q):
        days = 14
        if "30" in q or "month" in q:
            days = 30
        m = re.search(r"(\d+)\s*days?|last\s*(\d+)", q)
        if m:
            days = min(90, max(7, int(m.group(1) or m.group(2) or days)))
        return "orders_chart", {"days": days}

    # Top products
    if any(x in q for x in ["top product", "top 5 product", "top 10 product", "best product", "best sell", "best seller", "what sells", "popular product", "best selling"]) or ("top" in q and "product" in q) or ("by revenue" in q and "product" in q):
        limit = 5
        m = re.search(r"top\s*(\d+)|(\d+)\s*product", q, re.I)
        if m:
            limit = min(20, max(1, int(m.group(1) or m.group(2) or 5)))
        return "top_products", {"limit": limit}
    if "product" in q and ("sell" in q or "revenue" in q):
        return "top_products", {"limit": 5}

    # Recent orders
    if any(x in q for x in ["recent order", "latest order", "list order", "show order", "my order"]):
        return "recent_orders", {"limit": 10}
    if q in ("orders", "order") or (len(q) < 25 and "order" in q and "chart" not in q and "trend" not in q):
        return "recent_orders", {"limit": 10}

    # Recent customers
    if any(x in q for x in ["recent customer", "latest customer", "new customer", "list customer", "show customer", "who are my customer"]):
        return "recent_customers", {"limit": 10}
    if "customer" in q and "segment" not in q and "at risk" not in q and "count" not in q and "how many" not in q:
        return "recent_customers", {"limit": 10}

    # KPIs
    if any(x in q for x in ["kpi", "summary", "total", "overview", "how much", "how many", "sales", "growth"]):
        return "kpis", {}
    if "revenue" in q and "total" in q:
        return "kpis", {}
    if "revenue" in q and not any(x in q for x in ["chart", "last", "week", "month", "30", "7", "14", "60", "trend", "over time"]):
        return "kpis", {}
    if "customer count" in q or "order count" in q or "number of customer" in q or "number of order" in q:
        return "kpis", {}

    # Default to KPIs
    return "kpis", {}


def ask_question(db, user_id, question: str, llm_func=None) -> dict:
    """Execute question and return answer + data."""
    intent, params = _extract_intent_and_params(question, llm_func)

    data = None
    answer = ""
    q = question.lower().strip()

    if intent == "kpis":
        kpis_data = get_kpis(db, user_id)
        # Tailor answer when question focuses on a single metric
        if "customer" in q and ("how many" in q or "count" in q or "number" in q) and "order" not in q:
            answer = f"You have {kpis_data['total_customers']} customer{'s' if kpis_data['total_customers'] != 1 else ''}."
            data = None  # No need for raw JSON for simple count
        elif "order" in q and ("how many" in q or "count" in q or "number" in q) and "customer" not in q:
            answer = f"You have {kpis_data['total_orders']} order{'s' if kpis_data['total_orders'] != 1 else ''}."
            data = None
        elif ("revenue" in q or "sales" in q or "how much" in q) and "order" not in q and "customer" not in q:
            answer = f"Total revenue: ${kpis_data['total_revenue']:,.0f}. Monthly growth: {kpis_data['monthly_growth']}%."
            data = None
        else:
            data = kpis_data
            answer = f"Total revenue: ${kpis_data['total_revenue']:,.0f}. Total orders: {kpis_data['total_orders']}. Total customers: {kpis_data['total_customers']}. Monthly growth: {kpis_data['monthly_growth']}%."

    elif intent == "revenue_chart":
        days = params.get("days", 30)
        data = get_revenue_chart(db, user_id, days)
        total = sum(r["revenue"] for r in data)
        answer = f"Revenue over the last {days} days: ${total:,.0f} total. {len(data)} days with data."

    elif intent == "orders_chart":
        days = params.get("days", 14)
        data = get_orders_chart(db, user_id, days)
        total = sum(r["orders"] for r in data)
        answer = f"Orders over the last {days} days: {total} total. {len(data)} days with data."

    elif intent == "top_products":
        limit = params.get("limit", 5)
        data = get_top_products(db, user_id, limit)
        answer = f"Top {len(data)} products by revenue: " + ", ".join(f"{r['product']} (${r['revenue']:,.0f})" for r in data)

    elif intent == "recent_orders":
        limit = params.get("limit", 10)
        orders = get_recent_orders(db, user_id, limit)
        data = []
        for o in orders:
            cust_name = None
            if o.customer:
                cust_name = o.customer.name
            data.append({
                "order_id": o.order_id,
                "product": o.product,
                "total": round(o.price * o.quantity, 2),
                "customer": cust_name,
                "date": str(o.purchase_date.date()),
            })
        answer = f"Last {len(data)} orders."

    elif intent == "recent_customers":
        limit = params.get("limit", 10)
        customers = get_recent_customers(db, user_id, limit)
        data = [
            {"name": c.name, "email": c.email, "total_purchases": round(float(c.total_purchases or 0), 2)}
            for c in customers
        ]
        answer = f"Last {len(data)} customers."

    elif intent == "segments":
        segments = compute_segments(db, user_id)
        data = [{"segment": s["name"], "customer_count": s["customer_count"]} for s in segments]
        total = sum(s["customer_count"] for s in segments)
        answer = f"Customer segments (RFM + K-means): {len(segments)} segments, {total} customers total. " + ", ".join(f"{s['name']}: {s['customer_count']}" for s in segments)

    elif intent == "at_risk":
        days = params.get("days", 60)
        customers = get_at_risk_customers(db, user_id, inactive_days=days)
        data = [
            {"name": c["name"], "email": c["email"], "days_since_order": c["days_since_order"], "total_purchases": round(c["total_purchases"], 2), "score": c["score"], "reason": c["reason"]}
            for c in customers[:20]
        ]
        answer = f"Found {len(customers)} at-risk customers (inactive >{days} days)." + (f" Top {len(data)} by risk score." if len(customers) > 20 else "")

    elif intent == "alerts":
        alerts_list = get_alerts(db, user_id)
        data = [{"type": a["type"], "severity": a["severity"], "message": a["message"]} for a in alerts_list]
        if not alerts_list:
            answer = "No alerts. All metrics are within expected ranges."
        else:
            answer = f"Found {len(alerts_list)} alert(s): " + "; ".join(a["message"] for a in alerts_list[:3])

    elif intent == "recommendations":
        recs = get_recommendations(db, user_id, min_cooccurrence=2)
        data = []
        for r in recs[:15]:
            others = [x["product"] for x in r["also_bought"][:3]]
            if others:
                data.append({"product": r["product"], "also_bought": ", ".join(others), "count": len(r["also_bought"])})
        answer = f"Product recommendations (customers who bought X also bought Y). {len(recs)} products with suggestions." + (f" Showing top {len(data)}." if len(data) < len(recs) else "")

    elif intent == "ltv":
        limit = params.get("limit", 10)
        customers = get_ltv_predictions(db, user_id, limit=limit)
        data = [
            {"name": c["name"], "email": c["email"], "historical_ltv": c["historical_ltv"], "predicted_ltv_6m": c["predicted_ltv_6m"], "predicted_ltv_12m": c["predicted_ltv_12m"]}
            for c in customers
        ]
        answer = f"LTV predictions for top {len(data)} customers. Predicted 6m and 12m value based on historical spend rate."

    elif intent == "anomalies":
        days = params.get("days", 30)
        anomalies_list = detect_anomalies(db, user_id, days=days)
        data = anomalies_list
        if not anomalies_list:
            answer = f"No anomalies detected in the last {days} days."
        else:
            answer = f"Found {len(anomalies_list)} anomal{'y' if len(anomalies_list) == 1 else 'ies'} in the last {days} days (significant drops vs rolling average)."

    else:
        answer = "I didn't catch that. Try: \"What's my total revenue?\", \"Top 5 products\", \"List orders\", or \"Customer segments\"."

    return {"answer": answer, "data": data, "chart_type": intent if "chart" in intent else None}
