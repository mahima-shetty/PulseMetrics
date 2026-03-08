from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://founder:founder_secret@localhost:5432/founderdashboard"
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_BASE_URL: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def llm_api_key(self) -> str:
        """Use GROQ_API_KEY if set, otherwise OPENAI_API_KEY."""
        return self.GROQ_API_KEY or self.OPENAI_API_KEY

    @property
    def llm_base_url(self) -> str | None:
        """Use Groq API URL when GROQ_API_KEY is set."""
        if self.GROQ_API_KEY:
            return "https://api.groq.com/openai/v1"
        return self.LLM_BASE_URL or None

    @property
    def llm_model(self) -> str:
        """Use Groq model when using Groq API."""
        if self.GROQ_API_KEY:
            groq_prefixes = ("llama", "mixtral", "whisper")
            if any(self.LLM_MODEL.lower().startswith(p) for p in groq_prefixes):
                return self.LLM_MODEL
            return "llama-3.1-8b-instant"
        return self.LLM_MODEL

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
