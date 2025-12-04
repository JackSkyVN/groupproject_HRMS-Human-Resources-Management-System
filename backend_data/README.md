# HRMS Backend (FastAPI)

Quickstart (dev):

1. Create a Python virtual environment and install requirements:

```bash
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r backend_data/requirements.txt
```

2. Run the API locally:

```bash
uvicorn app.main:app --app-dir backend_data --reload --port 8000
```

3. Or via Docker Compose (requires Docker Desktop):

```bash
cd backend_data
docker compose up -d
```

Health check: http://localhost:8000/api/v1/health


## Standard local setup (four terminals)

All terminals use cwd `backend_data` and PowerShell:

1) Infra
```
docker compose up -d postgres redis
```

2) API
```
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3) Celery worker
```
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
celery -A app.tasks.worker.celery_app worker -l info
```

4) Celery beat
```
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
celery -A app.tasks.worker.celery_app beat -l info --schedule ./celerybeat-schedule
```

## Initialize DB and seed RBAC
```
alembic upgrade head
python .\scripts\seed_rbac.py
```

## Login flow (JWT)
POST `/api/v1/auth/login` with body:
```
{"email": "admin@example.com", "password": "admin123"}
```
Response contains `access_token`. Use header `Authorization: Bearer <token>`.

## Smoke tests
- GET `/api/v1/attendance?limit=10`
- GET `/api/v1/attendance/export` (saves a timestamped xlsx to `backend_data/backups`)
- POST `/api/v1/system/reset` (admin-only)

## Run tests
```
pytest -q
```





