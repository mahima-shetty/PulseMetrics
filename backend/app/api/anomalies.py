from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.anomaly_service import detect_anomalies

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


@router.get("")
def get_anomalies(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detected anomalies (revenue/order drops) in the period."""
    return {"anomalies": detect_anomalies(db, current_user.id, days=days)}
