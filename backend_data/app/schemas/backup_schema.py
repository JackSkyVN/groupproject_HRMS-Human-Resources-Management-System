from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BackupCreate(BaseModel):
    backup_type: str = "full"  # "full" or "incremental"


class BackupResponse(BaseModel):
    id: int
    backup_file_path: str
    backup_type: str
    backup_size_mb: float
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RestoreRequest(BaseModel):
    backup_file_path: str
    confirm: bool = False


class BackupInfo(BaseModel):
    path: str
    size_mb: float
    created_at: str
    modified_at: str

