import random
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order

CUSTOMERS = [
    {"name": "Acme Corp", "email": "billing@acmecorp.com", "company": "Acme Corp", "phone": "+1-555-0101"},
    {"name": "TechStart Inc", "email": "finance@techstart.io", "company": "TechStart Inc", "phone": "+1-555-0102"},
    {"name": "CloudNine Solutions", "email": "accounts@cloudnine.co", "company": "CloudNine Solutions", "phone": "+1-555-0103"},
    {"name": "DataFlow Analytics", "email": "billing@dataflow.ai", "company": "DataFlow Analytics", "phone": "+1-555-0104"},
    {"name": "ScaleUp Ventures", "email": "ap@scaleup.vc", "company": "ScaleUp Ventures", "phone": "+1-555-0105"},
    {"name": "NextGen Labs", "email": "finance@nextgenlabs.com", "company": "NextGen Labs", "phone": "+1-555-0106"},
    {"name": "InnovateCo", "email": "billing@innovateco.io", "company": "InnovateCo", "phone": "+1-555-0107"},
    {"name": "GrowthStack", "email": "accounts@growthstack.com", "company": "GrowthStack", "phone": "+1-555-0108"},
    {"name": "MetricMind", "email": "finance@metricmind.ai", "company": "MetricMind", "phone": "+1-555-0109"},
    {"name": "LaunchPad Pro", "email": "billing@launchpadpro.co", "company": "LaunchPad Pro", "phone": "+1-555-0110"},
    {"name": "FutureOps", "email": "ap@futureops.io", "company": "FutureOps", "phone": "+1-555-0111"},
    {"name": "RevenueStream", "email": "accounts@revenuestream.com", "company": "RevenueStream", "phone": "+1-555-0112"},
    {"name": "AgileBase", "email": "finance@agilebase.io", "company": "AgileBase", "phone": "+1-555-0113"},
    {"name": "StartupScale", "email": "billing@startupscale.co", "company": "StartupScale", "phone": "+1-555-0114"},
    {"name": "FounderForge", "email": "accounts@founderforge.ai", "company": "FounderForge", "phone": "+1-555-0115"},
]

PRODUCTS = [
    {"product": "Pro Plan", "price_range": (99, 299)},
    {"product": "Enterprise License", "price_range": (999, 4999)},
    {"product": "Consulting - Strategy", "price_range": (500, 2500)},
    {"product": "Workshop", "price_range": (200, 800)},
    {"product": "API Access", "price_range": (49, 199)},
    {"product": "Support Pack", "price_range": (150, 500)},
    {"product": "Starter Plan", "price_range": (29, 99)},
    {"product": "Training Session", "price_range": (300, 1200)},
    {"product": "Custom Integration", "price_range": (1000, 5000)},
    {"product": "Analytics Add-on", "price_range": (79, 249)},
]


def seed_demo_data(db: Session, user_id: UUID) -> dict:
    """Create sample customers and orders for demo. Returns counts."""
    now = datetime.utcnow()
    start_date = now - timedelta(days=120)  # 120 days ago so some orders are 60+ days old (for at-risk demo)

    existing_emails = {c.email for c in db.query(Customer).filter(Customer.user_id == user_id).all()}
    customers_to_create = [c for c in CUSTOMERS if c["email"] not in existing_emails]

    created_customers: list[Customer] = []
    for c in customers_to_create:
        cust = Customer(
            user_id=user_id,
            name=c["name"],
            email=c["email"],
            phone=c.get("phone", ""),
            company=c.get("company", ""),
        )
        db.add(cust)
        created_customers.append(cust)

    db.flush()

    all_customers = (
        db.query(Customer).filter(Customer.user_id == user_id).all()
    )
    if not all_customers:
        db.commit()
        return {"customers_created": 0, "orders_created": 0}

    orders_created = 0
    num_orders = random.randint(80, 120)
    next_ord_num = 1
    last_order = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).first()
    if last_order:
        try:
            next_ord_num = int(last_order.order_id.split("-")[1]) + 1
        except (IndexError, ValueError):
            pass

    for i in range(num_orders):
        customer = random.choice(all_customers)
        product_info = random.choice(PRODUCTS)
        price = random.uniform(*product_info["price_range"])
        price = round(price, 2)
        quantity = random.randint(1, 3)
        days_ago = random.randint(0, 120)
        purchase_date = start_date + timedelta(days=days_ago)
        purchase_date = purchase_date.replace(hour=random.randint(9, 17), minute=random.randint(0, 59), second=0, microsecond=0)

        order_id = f"ORD-{next_ord_num + i:03d}"

        order = Order(
            user_id=user_id,
            customer_id=customer.id,
            order_id=order_id,
            product=product_info["product"],
            price=price,
            quantity=quantity,
            purchase_date=purchase_date,
        )
        db.add(order)

        customer.total_purchases = (customer.total_purchases or 0) + (price * quantity)
        if customer.last_purchase_date is None or purchase_date > customer.last_purchase_date:
            customer.last_purchase_date = purchase_date

        orders_created += 1

    db.commit()
    return {"customers_created": len(created_customers), "orders_created": orders_created}
