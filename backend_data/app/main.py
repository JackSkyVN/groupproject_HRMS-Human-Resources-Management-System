from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
import time
from app.core.config import settings
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.attendance import router as attendance_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.employee import router as employee_router
from app.api.v1.routes.leaves import router as leaves_router
from app.api.v1.routes.payroll import router as payroll_router
from app.api.v1.routes.announcement import router as announcement_router
from app.api.v1.routes.metadata import router as metadata_router
from app.api.v1.routes.salary_adjustments import router as salary_adj_router

from app.core.database import Base, engine
import app.models  

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Các sự kiện vòng đời ứng dụng."""
    # Start
    print("\n\n" + "="*50)
    print(">>> HRMS SERVER STARTED - NEW SCHEMA ACTIVE <<<")
    print("="*50 + "\n\n")
    print("HRMS Startup: Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("HRMS Tables Created.")
    
    yield
    print("HRMS Shutdown.")


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
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    # catch legacy redirects from frontend
    path = request.url.path
    if "Login screen" in path or "Login%20screen" in path:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/login/index.html")
        
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Router
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(attendance_router, prefix=f"{settings.api_prefix}/attendance", tags=["attendance"])
app.include_router(employee_router, prefix=f"{settings.api_prefix}/employees", tags=["employees"])
app.include_router(leaves_router, prefix=f"{settings.api_prefix}/leaves", tags=["leaves"])
app.include_router(payroll_router, prefix=f"{settings.api_prefix}/payroll", tags=["payroll"])
app.include_router(salary_adj_router, prefix=f"{settings.api_prefix}/salary-adjustments", tags=["salary-adjustments"])
app.include_router(announcement_router, prefix=settings.api_prefix, tags=["announcements"])
# PUBLIC metadata endpoints - NO AUTH - separate prefix!
app.include_router(metadata_router, prefix="/public", tags=["metadata"])

# ==================== FRONTEND HOSTING (SPA ROUTING) ====================

# Path to the frontend directory
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "finova"))

if os.path.exists(FRONTEND_DIR):
    # Mount only existing static directories
    app.mount("/finova/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    app.mount("/login", StaticFiles(directory=os.path.join(FRONTEND_DIR, "login")), name="login")

    @app.get("/finova/login")
    @app.get("/login")
    async def serve_login():
        """Serve login page at a professional URL."""
        login_index = os.path.join(FRONTEND_DIR, "login", "index.html")
        return FileResponse(login_index)

    @app.get("/finova/{path:path}")
    async def serve_frontend(path: str):
        """
        Catch-all for /finova: 
        1. If path looks like a file (has dot), try to serve it.
        2. Otherwise serve index.html for SPA.
        """
        # Exclude login path from catch-all if it's already handled
        if path.strip("/") == "login":
            return FileResponse(os.path.join(FRONTEND_DIR, "login", "index.html"))

        # If path is empty (it's just /finova/), serve index.html
        if not path or path == "/":
            return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

        # Check for root files like styles.css
        file_path = os.path.join(FRONTEND_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Everything else goes to index.html (SPA)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/finova")
    @app.get("/")
    async def index_redirect():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
