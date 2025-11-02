from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import health, auth, rbac, backup, attendance_validation, email
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="HRMS Backend",
        version="0.1.0",
        description="Human Resources Management System Backend API",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router, prefix=settings.api_v1_prefix)
    app.include_router(auth.router, prefix=settings.api_v1_prefix)
    app.include_router(rbac.router, prefix=settings.api_v1_prefix)
    app.include_router(backup.router, prefix=settings.api_v1_prefix)
    app.include_router(attendance_validation.router, prefix=settings.api_v1_prefix)
    app.include_router(email.router, prefix=settings.api_v1_prefix)

    return app


app = create_app()


