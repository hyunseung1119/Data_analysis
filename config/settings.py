"""
Config settings using Pydantic Settings
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./storage/sqlite/app.db"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = True
    
    # LangChain
    langchain_tracing_v2: bool = False
    langchain_api_key: Optional[str] = None
    langchain_project: str = "multi-agent-decision"
    
    # Paths
    chroma_dir: str = "./storage/chroma"
    config_dir: str = "./config"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
