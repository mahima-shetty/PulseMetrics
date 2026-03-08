"""
Product recommendations via co-occurrence: "Customers who bought X also bought Y".
"""
from collections import defaultdict
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.order import Order


def get_recommendations(db: Session, user_id: UUID, min_cooccurrence: int = 2) -> list[dict]:
    """
    For each product, find other products frequently bought by the same customers.
    Returns [{ product, also_bought: [{ product, strength }] }] sorted by product revenue/volume.
    """
    orders = (
        db.query(Order.customer_id, Order.product)
        .filter(Order.user_id == user_id)
        .all()
    )

    # customer_id -> set of products they bought
    customer_products: dict[UUID, set[str]] = defaultdict(set)
    for cid, product in orders:
        customer_products[cid].add(product)

    # product_a -> product_b -> count of customers who bought both
    cooccur: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for cid, products in customer_products.items():
        prod_list = list(products)
        for i, pa in enumerate(prod_list):
            for pb in prod_list:
                if pa != pb:
                    cooccur[pa][pb] += 1

    # Build output: for each product, top also_bought by strength
    product_set = {p for prods in customer_products.values() for p in prods}
    result = []

    for product in sorted(product_set):
        others = cooccur.get(product, {})
        filtered = [
            {"product": pb, "strength": cnt}
            for pb, cnt in others.items()
            if cnt >= min_cooccurrence
        ]
        filtered.sort(key=lambda x: x["strength"], reverse=True)
        result.append({
            "product": product,
            "also_bought": filtered[:10],
        })

    # Sort by number of recommendations (most useful first)
    result.sort(key=lambda x: len(x["also_bought"]), reverse=True)
    return result
