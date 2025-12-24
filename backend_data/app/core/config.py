from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "HRMS"
    api_prefix: str = "/api/v1"

    secret_key: str = "change_me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480 # Extended to 8 hours for better testing experience
    skip_strict_reset_on_reload: bool = True # Set to True to prevent data loss on every code save

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "hrms"
    postgres_user: str = "hrms"
    postgres_password: str = "Project@123"

    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:8080,http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500"

    # Cài đặt Email
    MAIL_USERNAME: str = "your_email@example.com"
    MAIL_PASSWORD: str = "your_password"
    MAIL_FROM: str = "your_email@example.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()