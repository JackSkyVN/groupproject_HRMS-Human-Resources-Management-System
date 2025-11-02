from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from app.db.base import get_db
from app.schemas.attendance_schema import (
    AttendanceValidationRequest,
    SnapshotValidationRequest,
    DateSnapshotRequest,
    ValidationResponse,
    SnapshotResponse,
    AttendanceLogResponse
)
from app.middleware.rbac_middleware import get_current_user, require_view, require_edit
from app.services.attendance_validation_service import AttendanceValidationService

router = APIRouter(prefix="/attendance-validation", tags=["Attendance Validation"])


@router.post("/validate-log", response_model=ValidationResponse)
async def validate_attendance_log(
    request: AttendanceValidationRequest,
    current_user: dict = Depends(require_view("attendance")),
    db: Session = Depends(get_db)
):
    """Validate an attendance log entry (requires view permission on attendance)."""
    validation_service = AttendanceValidationService()
    result = validation_service.validate_attendance_log(db, request.attendance_log_id)
    return ValidationResponse(**result)


@router.post("/validate-snapshot", response_model=ValidationResponse)
async def validate_snapshot(
    request: SnapshotValidationRequest,
    current_user: dict = Depends(require_view("attendance")),
    db: Session = Depends(get_db)
):
    """Validate a single attendance snapshot (requires view permission on attendance)."""
    validation_service = AttendanceValidationService()
    result = validation_service.validate_snapshot(db, request.snapshot_id)
    return ValidationResponse(**result)


@router.post("/verify-date-snapshots", response_model=ValidationResponse)
async def verify_snapshots_for_date(
    request: DateSnapshotRequest,
    current_user: dict = Depends(require_view("attendance")),
    db: Session = Depends(get_db)
):
    """Verify all snapshots for an employee on a specific date (requires view permission on attendance)."""
    validation_service = AttendanceValidationService()
    result = validation_service.verify_snapshot_for_date(
        db, request.employee_id, request.check_date
    )
    return ValidationResponse(**result)


@router.get("/snapshots/{check_date}", response_model=List[SnapshotResponse])
async def get_snapshots_for_date(
    check_date: date,
    employee_id: int = None,
    current_user: dict = Depends(require_view("attendance")),
    db: Session = Depends(get_db)
):
    """Get all snapshots for a specific date (requires view permission on attendance)."""
    validation_service = AttendanceValidationService()
    snapshots = validation_service.get_snapshots_for_date(
        db, check_date, employee_id
    )
    return snapshots


@router.post("/validate-all-today")
async def validate_all_attendance_today(
    current_user: dict = Depends(require_edit("attendance")),
    db: Session = Depends(get_db)
):
    """Validate all attendance logs for today (requires edit permission on attendance)."""
    from datetime import datetime
    from app.db.models import AttendanceLog
    
    today = datetime.now().date()
    start_datetime = datetime.combine(today, datetime.min.time())
    end_datetime = datetime.combine(today, datetime.max.time())
    
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.check_in_time >= start_datetime,
        AttendanceLog.check_in_time <= end_datetime
    ).all()
    
    validation_service = AttendanceValidationService()
    results = []
    
    for log in logs:
        result = validation_service.validate_attendance_log(db, log.id)
        results.append(result)
    
    valid_count = sum(1 for r in results if r["valid"])
    invalid_count = len(results) - valid_count
    
    return {
        "date": today.isoformat(),
        "total_logs": len(results),
        "valid_logs": valid_count,
        "invalid_logs": invalid_count,
        "results": results
    }

