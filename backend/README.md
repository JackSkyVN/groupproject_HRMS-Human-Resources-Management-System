# HRMS Backend

## Quick start

1) Create a virtual environment and install dependencies
```powershell
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
```

2) Run the API locally
```powershell
uvicorn backend.app.main:app --reload
```

3) Health check
```
GET http://127.0.0.1:8000/api/v1/health
```

Next steps:
- Add PostgreSQL + SQLAlchemy + Alembic
- Implement Auth (JWT) and User/Employee models
- Add Redis for caching and background jobs
