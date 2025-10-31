from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "HRMS Backend"
    environment: str = "dev"
    api_v1_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()


