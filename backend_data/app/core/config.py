from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App Config
    app_name: str = "HRMS Backend"
    environment: str = "dev"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database Config
    database_url: str = "postgresql://postgres:postgres@localhost:5432/hrms_db"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    
    # Redis Config
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600
    
    # Email Config
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_use_tls: bool = True
    
    # Backup Config
    backup_dir: str = "./backups"
    backup_retention_days: int = 30
    backup_schedule_hours: int = 24  # Daily backup
    
    # File Storage
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 10
    allowed_image_types: list[str] = [".jpg", ".jpeg", ".png"]
    
    # Security
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
