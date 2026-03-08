from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.services.ask_service import ask_question
from app.services.llm_service import extract_ask_intent

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    question: str


def _get_llm_func():
    """Return LLM intent extractor if API key configured, else None."""
    if get_settings().llm_api_key:
        return extract_ask_intent
    return None


@router.post("")
def ask(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Natural language query over dashboard data. Returns answer + optional data/chart."""
    return ask_question(db, current_user.id, body.question.strip(), llm_func=_get_llm_func())
