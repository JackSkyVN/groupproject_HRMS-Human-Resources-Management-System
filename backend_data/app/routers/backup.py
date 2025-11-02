from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.schemas.backup_schema import BackupCreate, BackupResponse, RestoreRequest, BackupInfo
from app.middleware.rbac_middleware import get_current_user, require_edit
from app.services.backup_service import BackupService

router = APIRouter(prefix="/backup", tags=["Backup"])


@router.post("/create", response_model=BackupResponse)
async def create_backup(
    backup_data: BackupCreate,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Create a database backup (requires edit permission on system)."""
    backup_service = BackupService()
    backup_record = backup_service.create_backup(db, backup_data.backup_type)
    
    if not backup_record:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create backup"
        )
    
    return backup_record


@router.get("/list", response_model=List[BackupResponse])
async def list_backups(
    limit: int = 50,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """List all backups (requires edit permission on system)."""
    backup_service = BackupService()
    backups = backup_service.list_backups(db, limit)
    return backups


@router.post("/restore")
async def restore_backup(
    restore_data: RestoreRequest,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Restore database from a backup (requires edit permission on system)."""
    if not restore_data.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restore confirmation required. Set confirm=true"
        )
    
    backup_service = BackupService()
    success = backup_service.restore_backup(restore_data.backup_file_path, db)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore backup"
        )
    
    return {"message": "Backup restored successfully"}


@router.post("/cleanup")
async def cleanup_old_backups(
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Clean up old backup files (requires edit permission on system)."""
    backup_service = BackupService()
    deleted_count = backup_service.cleanup_old_backups(db)
    
    return {"message": f"Cleaned up {deleted_count} old backup files"}


@router.get("/info/{backup_file_path:path}")
async def get_backup_info(
    backup_file_path: str,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Get information about a backup file (requires edit permission on system)."""
    backup_service = BackupService()
    info = backup_service.get_backup_info(backup_file_path)
    
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found"
        )
    
    return BackupInfo(**info)

