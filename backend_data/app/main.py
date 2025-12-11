from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import time
from app.core.config import settings
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.attendance import router as attendance_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.system import router as system_router
from app.api.v1.routes.employee import router as employee_router


from app.core.database import Base, engine
import app.models  

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Các sự kiện vòng đời ứng dụng."""
    # Start
    print("HRMS Startup: Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("HRMS Tables Created.")
    yield
    # Turndown
    print("HRMS")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware cho phép frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Router
from app.api.v1.routes.attendance import router as attendance_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.system import router as system_router
from app.api.v1.routes.employee import router as employee_router
from app.api.v1.routes.leaves import router as leaves_router
from app.api.v1.routes.payroll import router as payroll_router
from app.api.v1.routes.announcement import router as announcement_router

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(attendance_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(system_router, prefix=settings.api_prefix)
app.include_router(employee_router, prefix=settings.api_prefix, tags=["employees"])
app.include_router(leaves_router, prefix=settings.api_prefix, tags=["leaves"])
app.include_router(payroll_router, prefix=settings.api_prefix, tags=["payroll"])
app.include_router(announcement_router, prefix=settings.api_prefix, tags=["announcements"])
