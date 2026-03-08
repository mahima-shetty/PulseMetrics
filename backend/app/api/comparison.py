from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.comparison_service import get_period_comparison

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.get("")
def get_comparison(
    mode: str = Query("month", description="Compare 'month' or 'week'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Period-over-period comparison: this month vs last month, or this week vs last week."""
    if mode not in ("month", "week"):
        mode = "month"
    return get_period_comparison(db, current_user.id, mode)
