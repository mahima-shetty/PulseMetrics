from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.seed_service import seed_demo_data

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("/demo-data")
def post_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seed demo customers and orders for the current user."""
    result = seed_demo_data(db, current_user.id)
    return result
