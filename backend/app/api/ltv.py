from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.ltv_service import get_ltv_predictions

router = APIRouter(prefix="/ltv", tags=["ltv"])


@router.get("")
def list_ltv(
    limit: int = Query(50, ge=10, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customer LTV predictions (historical + predicted 6m, 12m)."""
    return {"customers": get_ltv_predictions(db, current_user.id, limit=limit)}
