from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.alerts_service import get_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts(
    revenue_drop_pct: float = Query(30, ge=10, le=80, description="Revenue drop % to trigger alert"),
    inactive_days: int = Query(60, ge=14, le=365, description="Days inactive for high-value customer alert"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get smart alerts (revenue drop, inactive high-value customers, order drop)."""
    return {"alerts": get_alerts(db, current_user.id, revenue_drop_pct=revenue_drop_pct, inactive_days=inactive_days)}
