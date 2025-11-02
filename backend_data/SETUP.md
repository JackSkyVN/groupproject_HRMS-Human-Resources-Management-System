# HRMS Backend Setup Guide

Complete step-by-step setup instructions for the HRMS Backend system.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
2. **PostgreSQL 14+** - [Download PostgreSQL](https://www.postgresql.org/download/)
3. **Redis 6+** - [Download Redis](https://redis.io/download) (for caching and background jobs)
4. **Git** - [Download Git](https://git-scm.com/downloads)
5. **pg_dump and pg_restore** - Usually included with PostgreSQL installation

## Step-by-Step Installation

### Step 1: Clone and Navigate to Project

```powershell
cd "C:\Group Project\groupproject_HRMS-Human-Resources-Management-System"
```

### Step 2: Create Virtual Environment

```powershell
python -m venv .venv
```

### Step 3: Activate Virtual Environment

```powershell
. .\.venv\Scripts\Activate.ps1
```

If you get a PowerShell execution policy error, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

Then try activating again:
```powershell
. .\.venv\Scripts\Activate.ps1
```

### Step 4: Install Dependencies

```powershell
pip install -r backend_data/requirements.txt
```

### Step 5: Install PostgreSQL

1. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. During installation, set a password for the `postgres` user (remember this!)
3. Note the default port (usually 5432)

### Step 6: Create Database

1. Open **pgAdmin** (comes with PostgreSQL) or use **psql** command line:

**Using pgAdmin:**
- Right-click on "Databases" → "Create" → "Database"
- Name: `hrms_db`
- Owner: `postgres`
- Click "Save"

**Using psql (Command Line):**
```powershell
psql -U postgres
```
Then:
```sql
CREATE DATABASE hrms_db;
\q
```

### Step 7: Install and Start Redis

**Windows:**
1. Download Redis for Windows from [GitHub](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`
3. Redis will run on `localhost:6379` by default

**Alternative (Using WSL):**
```bash
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

### Step 8: Configure Environment Variables

1. Copy the example environment file:
```powershell
Copy-Item backend_data\.env.example backend_data\.env
```

2. Edit `backend_data/.env` with your actual values:
```env
# Update these values:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hrms_db
SECRET_KEY=generate-a-strong-random-secret-key-here
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-email-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**To generate a secret key:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

**For Gmail SMTP:**
- Enable 2-factor authentication
- Generate an "App Password" at [Google Account Settings](https://myaccount.google.com/apppasswords)
- Use the app password in `SMTP_PASSWORD`

### Step 9: Initialize Database with Alembic

1. Navigate to backend_data directory:
```powershell
cd backend_data
```

2. Initialize Alembic (first time only):
```powershell
alembic init alembic
```

3. Create initial migration:
```powershell
alembic revision --autogenerate -m "Initial migration"
```

4. Run migrations:
```powershell
alembic upgrade head
```

### Step 10: Create Required Directories

```powershell
New-Item -ItemType Directory -Force -Path backups,uploads
```

### Step 11: Run the Application

From the project root:
```powershell
uvicorn backend_data.app.main:app --reload
```

The API will be available at:
- **API**: http://127.0.0.1:8000
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **Health Check**: http://127.0.0.1:8000/api/v1/health

### Step 12: Test the Installation

1. Open http://127.0.0.1:8000/docs in your browser
2. Test the health endpoint:
   - Click on `/api/v1/health` → "Try it out" → "Execute"
   - Should return: `{"status":"ok"}`

3. Register a test user:
   - Use `/api/v1/auth/register` endpoint
   - Provide: email, username, full_name, password

4. Login:
   - Use `/api/v1/auth/login` endpoint
   - Provide: username, password
   - Copy the `access_token` from response

5. Test protected endpoint:
   - Click "Authorize" button at top of Swagger UI
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Test `/api/v1/rbac/permissions` endpoint

## Setting Up Background Tasks (Celery)

### Step 1: Start Redis (if not already running)

```powershell
redis-server
```

### Step 2: Start Celery Worker

In a new terminal (with venv activated):
```powershell
celery -A app.tasks.backup_tasks celery_app worker --loglevel=info
```

### Step 3: Start Celery Beat (for scheduled tasks)

In another terminal:
```powershell
celery -A app.tasks.backup_tasks celery_app beat --loglevel=info
```

## Your Backend Responsibilities - Quick Reference

### 1. Access Control Management (RBAC)
- **Endpoints**: `/api/v1/rbac/*`
- Grant view/edit/export permissions per role
- Test: Create roles, assign permissions, check user permissions

### 2. Database Backup & Restore
- **Endpoints**: `/api/v1/backup/*`
- Create backups: `POST /api/v1/backup/create`
- Restore: `POST /api/v1/backup/restore`
- List backups: `GET /api/v1/backup/list`
- Cleanup old: `POST /api/v1/backup/cleanup`

### 3. Attendance Validation
- **Endpoints**: `/api/v1/attendance-validation/*`
- Validate logs: `POST /api/v1/attendance-validation/validate-log`
- Validate snapshots: `POST /api/v1/attendance-validation/validate-snapshot`
- Check photos for same day: `POST /api/v1/attendance-validation/verify-date-snapshots`

### 4. Email Automation
- **Endpoints**: `/api/v1/email/*`
- Send custom email: `POST /api/v1/email/send`
- Attendance notification: `POST /api/v1/email/attendance-notification`
- Backup notification: `POST /api/v1/email/backup-notification`
- Validation report: `POST /api/v1/email/validation-report`

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env` file
- Check username/password are correct

### Redis Connection Error
- Check Redis is running: `redis-cli ping` (should return "PONG")
- Verify `REDIS_URL` in `.env` file

### Import Errors
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r backend_data/requirements.txt`
- Check Python path includes `backend_data` directory

### Permission Denied (PowerShell)
- Run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### Port Already in Use
- Change port: `uvicorn backend_data.app.main:app --reload --port 8001`
- Kill process using port: `netstat -ano | findstr :8000`

## Next Steps

1. ✅ Complete setup and verify health endpoint works
2. ✅ Register and login to get access token
3. ✅ Set up initial roles and permissions
4. ✅ Test backup/restore functionality
5. ✅ Configure email settings and test email sending
6. ✅ Integrate with frontend (your teammate's work)

## Support

For issues or questions:
- Check logs in terminal where uvicorn is running
- Review error messages in Swagger UI
- Check database connection and Redis status

Good luck with your HRMS project! 🚀

