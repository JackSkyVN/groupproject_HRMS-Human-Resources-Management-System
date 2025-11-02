# HRMS Backend

Backend system for Human Resources Management System with role-based access control, attendance validation, database backup/restore, and email automation.

## Features

✅ **Role-Based Access Control (RBAC)** - Grant view/edit/export permissions per role  
✅ **Database Backup & Restore** - Periodic backups and restore functionality  
✅ **Attendance Validation** - Verify time-attendance logs and photo snapshots  
✅ **Email Automation** - Automated email notifications for attendance, backups, and reports  
✅ **Photo Verification** - Check photos captured at check-in on the same day  

## Quick Start

📖 **For detailed setup instructions, see [SETUP.md](SETUP.md)**

### Basic Setup

1. Create virtual environment and install dependencies:
```powershell
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r backend_data/requirements.txt
```

2. Configure environment variables:
```powershell
Copy-Item backend_data\.env.example backend_data\.env
# Edit backend_data/.env with your database, email, and secret key
```

3. Initialize database:
```powershell
cd backend_data
alembic upgrade head
```

4. Run the API:
```powershell
uvicorn backend_data.app.main:app --reload
```

5. Access:
- **API**: http://127.0.0.1:8000
- **Swagger UI**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/api/v1/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get access token

### RBAC (Access Control)
- `GET /api/v1/rbac/permissions` - Get user permissions
- `GET /api/v1/rbac/check-permission/{resource}/{action}` - Check specific permission
- `POST /api/v1/rbac/assign-role/{user_id}/{role_name}` - Assign role to user
- `POST /api/v1/rbac/create-role` - Create role with permissions

### Backup & Restore
- `POST /api/v1/backup/create` - Create database backup
- `GET /api/v1/backup/list` - List all backups
- `POST /api/v1/backup/restore` - Restore from backup
- `POST /api/v1/backup/cleanup` - Clean up old backups

### Attendance Validation
- `POST /api/v1/attendance-validation/validate-log` - Validate attendance log
- `POST /api/v1/attendance-validation/validate-snapshot` - Validate snapshot
- `POST /api/v1/attendance-validation/verify-date-snapshots` - Verify snapshots for date
- `GET /api/v1/attendance-validation/snapshots/{check_date}` - Get snapshots for date

### Email
- `POST /api/v1/email/send` - Send custom email
- `POST /api/v1/email/attendance-notification` - Send attendance notification
- `POST /api/v1/email/backup-notification` - Send backup notification
- `POST /api/v1/email/validation-report` - Send validation report

## Documentation

- **[SETUP.md](SETUP.md)** - Complete setup instructions with troubleshooting
- **Swagger UI** - Interactive API documentation at `/docs` endpoint
- **ReDoc** - Alternative documentation at `/redoc` endpoint

## Requirements

- Python 3.11+
- PostgreSQL 14+
- Redis 6+ (for caching and background jobs)
- pg_dump/pg_restore (included with PostgreSQL)

## Project Structure

```
backend_data/
├── app/
│   ├── core/           # Configuration and security
│   ├── db/            # Database models and base
│   ├── middleware/    # RBAC middleware
│   ├── routers/       # API route handlers
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic services
│   └── tasks/         # Celery background tasks
├── alembic/           # Database migrations
├── backups/           # Database backup files (created automatically)
├── uploads/          # Uploaded files (created automatically)
├── requirements.txt  # Python dependencies
├── SETUP.md          # Setup guide
└── .env.example      # Environment variables template
```

## License

This is a group project for HRMS system.

