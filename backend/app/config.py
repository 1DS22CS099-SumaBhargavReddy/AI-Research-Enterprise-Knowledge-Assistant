import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///knowledge_db.db")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6336")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6380/0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_123456789_change_in_production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
