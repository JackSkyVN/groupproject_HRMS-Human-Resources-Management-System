from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class AttendanceValidationRequest(BaseModel):
    attendance_log_id: int


class SnapshotValidationRequest(BaseModel):
    snapshot_id: int


class DateSnapshotRequest(BaseModel):
    employee_id: int
    check_date: date


class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    log_id: Optional[int] = None
    snapshot_id: Optional[int] = None
    snapshot_count: Optional[int] = None


class SnapshotResponse(BaseModel):
    id: int
    attendance_log_id: int
    employee_id: Optional[int]
    image_path: str
    capture_time: datetime
    verified: bool
    verification_score: Optional[float]
    
    class Config:
        from_attributes = True


class AttendanceLogResponse(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[int]
    check_in_time: datetime
    check_out_time: Optional[datetime]
    status: str
    verified: bool
    verification_score: Optional[float]
    location: Optional[str]
    
    class Config:
        from_attributes = True

