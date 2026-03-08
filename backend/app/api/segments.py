from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.segmentation_service import compute_segments

router = APIRouter(prefix="/segments", tags=["segments"])


@router.get("")
def get_segments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customer segments (RFM + K-means)."""
    return {"segments": compute_segments(db, current_user.id)}
