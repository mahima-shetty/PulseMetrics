from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.recommendations_service import get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("")
def list_recommendations(
    min_customers: int = Query(
        2,
        ge=1,
        le=10,
        description="Minimum number of customers who bought both products to show as a recommendation",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get product recommendations (customers also bought)."""
    recs = get_recommendations(db, current_user.id, min_cooccurrence=min_customers)
    # Exclude products with no recommendations at this threshold
    recs = [r for r in recs if r["also_bought"]]
    return {"recommendations": recs}
