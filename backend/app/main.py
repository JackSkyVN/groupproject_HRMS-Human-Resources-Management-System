from fastapi import FastAPI
from .routers.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="HRMS Backend", version="0.1.0")

    # Routers
    app.include_router(health_router, prefix="/api/v1")

    return app


app = create_app()


