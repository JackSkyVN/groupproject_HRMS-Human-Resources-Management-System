import os
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import BackupRecord
import json


class BackupService:
    """Database Backup and Restore Service"""
    
    def __init__(self):
        self.backup_dir = Path(settings.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, db: Session, backup_type: str = "full") -> Optional[BackupRecord]:
        """Create a database backup."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"hrms_backup_{backup_type}_{timestamp}.sql"
        backup_path = self.backup_dir / backup_filename
        
        # Create backup record
        backup_record = BackupRecord(
            backup_file_path=str(backup_path),
            backup_type=backup_type,
            backup_size_mb=0,
            status="in_progress",
            started_at=datetime.now()
        )
        db.add(backup_record)
        db.commit()
        db.refresh(backup_record)
        
        try:
            # Extract database connection info from URL
            from urllib.parse import urlparse
            parsed = urlparse(settings.database_url)
            db_name = parsed.path.strip("/")
            db_user = parsed.username or "postgres"
            db_host = parsed.hostname or "localhost"
            db_port = parsed.port or 5432
            db_password = parsed.password or ""
            
            # Create pg_dump command
            env = os.environ.copy()
            if db_password:
                env["PGPASSWORD"] = db_password
            
            cmd = [
                "pg_dump",
                "-h", db_host,
                "-p", str(db_port),
                "-U", db_user,
                "-F", "c",  # Custom format
                "-f", str(backup_path),
                db_name
            ]
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Get file size
            file_size_mb = backup_path.stat().st_size / (1024 * 1024)
            
            # Update backup record
            backup_record.status = "completed"
            backup_record.completed_at = datetime.now()
            backup_record.backup_size_mb = round(file_size_mb, 2)
            db.commit()
            
            return backup_record
        
        except subprocess.CalledProcessError as e:
            backup_record.status = "failed"
            backup_record.error_message = str(e)
            backup_record.completed_at = datetime.now()
            db.commit()
            return None
        
        except Exception as e:
            backup_record.status = "failed"
            backup_record.error_message = str(e)
            backup_record.completed_at = datetime.now()
            db.commit()
            return None
    
    def restore_backup(self, backup_file_path: str, db: Session) -> bool:
        """Restore database from a backup file."""
        if not Path(backup_file_path).exists():
            return False
        
        try:
            # Extract database connection info
            from urllib.parse import urlparse
            parsed = urlparse(settings.database_url)
            db_name = parsed.path.strip("/")
            db_user = parsed.username or "postgres"
            db_host = parsed.hostname or "localhost"
            db_port = parsed.port or 5432
            db_password = parsed.password or ""
            
            env = os.environ.copy()
            if db_password:
                env["PGPASSWORD"] = db_password
            
            # Create pg_restore command
            cmd = [
                "pg_restore",
                "-h", db_host,
                "-p", str(db_port),
                "-U", db_user,
                "-d", db_name,
                "-c",  # Clean (drop) database objects before recreating
                str(backup_file_path)
            ]
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                check=True
            )
            
            return True
        
        except Exception as e:
            print(f"Restore error: {e}")
            return False
    
    def list_backups(self, db: Session, limit: int = 50) -> List[BackupRecord]:
        """List all backup records."""
        return db.query(BackupRecord).order_by(
            BackupRecord.created_at.desc()
        ).limit(limit).all()
    
    def cleanup_old_backups(self, db: Session) -> int:
        """Remove backup files older than retention period."""
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=settings.backup_retention_days)
        
        # Find old backup records
        old_backups = db.query(BackupRecord).filter(
            BackupRecord.created_at < cutoff_date
        ).all()
        
        deleted_count = 0
        for backup in old_backups:
            backup_path = Path(backup.backup_file_path)
            if backup_path.exists():
                try:
                    backup_path.unlink()
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting backup file {backup_path}: {e}")
            
            db.delete(backup)
        
        db.commit()
        return deleted_count
    
    def get_backup_info(self, backup_file_path: str) -> Optional[dict]:
        """Get information about a backup file."""
        backup_path = Path(backup_file_path)
        if not backup_path.exists():
            return None
        
        stat = backup_path.stat()
        return {
            "path": str(backup_path),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        }

