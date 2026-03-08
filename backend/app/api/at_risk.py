from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.churn_service import get_at_risk_customers

router = APIRouter(prefix="/at-risk", tags=["at-risk"])


@router.get("")
def get_at_risk(
    days: int = Query(60, ge=7, le=365, description="Inactive threshold in days"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customers at risk of churn (inactive beyond threshold)."""
    return {"customers": get_at_risk_customers(db, current_user.id, inactive_days=days)}
