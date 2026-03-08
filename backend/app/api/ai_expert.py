from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.rag_service import ask_ai_expert

router = APIRouter(prefix="/ai-expert", tags=["ai-expert"])


class AskExpertRequest(BaseModel):
    issue: str


@router.post("/ask")
def ask_expert(
    body: AskExpertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RAG + real business data for expert recommendations on business issues."""
    return ask_ai_expert(db, current_user.id, body.issue.strip())
