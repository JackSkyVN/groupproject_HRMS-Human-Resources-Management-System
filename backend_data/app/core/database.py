"""Quản lý kết nối và phiên làm việc cơ sở dữ liệu với các tối ưu hóa hiệu suất."""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings

# URL database
DATABASE_URL = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)


engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,  
    max_overflow=40,  
    pool_pre_ping=True, 
    pool_recycle=3600,  
    echo=False,
    connect_args={
        "connect_timeout": 10,
        "application_name": "hrms_backend"
    }
)

# Tạo lớp SessionLocal
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Lớp cơ sở cho các model
Base = declarative_base()


# Dependency để lấy phiên làm việc DB
def get_db():
    """Lấy phiên làm việc DB với tự động dọn dẹp."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

