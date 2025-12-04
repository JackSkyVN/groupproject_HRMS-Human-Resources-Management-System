from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, date, time
import os
import pandas as pd
import hashlib

from app.auth.deps import require_permission
from app.core.database import get_db
from app.core.cache import cache_get, cache_set, get_cache_key
from app.models.attendance import Attendance

router = APIRouter()


class AttendanceUpdate(BaseModel):
    id: int
    check_out_time: time | None = None
    verified: bool | None = None
    verification_reason: str | None = None
    status: str | None = None
    note: str | None = None


@router.get("/attendance", dependencies=[Depends(require_permission("attendance.view"))])
def list_attendance(
    db: Session = Depends(get_db),
    employee_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
):
    # Generate cache key from query parameters
    cache_params = f"{employee_id}_{date_from}_{date_to}_{skip}_{limit}"
    cache_key = get_cache_key("attendance", hashlib.md5(cache_params.encode()).hexdigest())
    
    # Try to get from cache (5 minute TTL)
    cached_result = cache_get(cache_key)
    if cached_result:
        return cached_result
    
    # Build optimized query with proper indexing
    stmt = select(Attendance)
    if employee_id is not None:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if date_from is not None:
        stmt = stmt.where(Attendance.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Attendance.date <= date_to)
    
    # Order by date descending, then time descending
    stmt = stmt.order_by(Attendance.date.desc(), Attendance.check_in_time.desc())
    stmt = stmt.offset(skip).limit(limit)
    
    rows = db.execute(stmt).scalars().all()
    items = [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "date": r.date,
            "check_in_time": r.check_in_time,
            "check_out_time": r.check_out_time,
            "status": r.status,
            "note": r.note,
            "snapshot_path": r.snapshot_path,
            "verified": r.verified,
            "verification_reason": r.verification_reason,
        }
        for r in rows
    ]
    result = {"items": items, "count": len(items)}
    
    # Cache result for 5 minutes
    cache_set(cache_key, result, expire=300)
    
    return result


@router.post("/attendance", dependencies=[Depends(require_permission("attendance.edit"))])
def update_attendance(payload: AttendanceUpdate, db: Session = Depends(get_db)):
    row = db.get(Attendance, payload.id)
    if not row:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if payload.check_out_time is not None:
        row.check_out_time = payload.check_out_time
    if payload.verified is not None:
        row.verified = payload.verified
    if payload.verification_reason is not None:
        row.verification_reason = payload.verification_reason
    if payload.status is not None:
        row.status = payload.status
    if payload.note is not None:
        row.note = payload.note
        
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}


@router.get("/attendance/export", dependencies=[Depends(require_permission("attendance.export"))])
def export_attendance(
    db: Session = Depends(get_db),
    employee_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
):
    stmt = select(Attendance)
    if employee_id is not None:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if date_from is not None:
        stmt = stmt.where(Attendance.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Attendance.date <= date_to)
        
    rows = db.execute(stmt).scalars().all()

    data = [
        {
            "ID": r.id,
            "Employee ID": r.employee_id,
            "Date": r.date,
            "Check In": r.check_in_time,
            "Check Out": r.check_out_time,
            "Status": r.status,
            "Note": r.note,
            "Verified": r.verified,
            "Reason": r.verification_reason,
        }
        for r in rows
    ]
    df = pd.DataFrame(data)

    # Compute backend_data root
    backend_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
    )
    out_dir = os.path.join(backend_root, "backups")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "attendance.xlsx")
    df.to_excel(out_path, index=False)
    return FileResponse(out_path, filename=os.path.basename(out_path))


class CheckInRequest(BaseModel):
    employee_id: int
    timestamp: datetime
    confidence: float | None = None
    snapshot_path: str | None = None

@router.post("/check-in", dependencies=[Depends(require_permission("attendance.edit"))])
def check_in(payload: CheckInRequest, db: Session = Depends(get_db)):
    """
    Endpoint for AI module to report attendance.
    """
    # Check for duplicate check-in within short window (e.g. 1 minute) to prevent spam
    spam_key = f"checkin_spam:{payload.employee_id}"
    if cache_get(spam_key):
        return {"ok": False, "detail": "Duplicate check-in ignored"}
    
    # Convert timestamp to date and time
    check_in_date = payload.timestamp.date()
    check_in_time = payload.timestamp.time()
    
    new_log = Attendance(
        employee_id=payload.employee_id,
        date=check_in_date,
        check_in_time=check_in_time,
        status="Present", # Default status
        snapshot_path=payload.snapshot_path,
        verified=True if (payload.confidence and payload.confidence > 0.8) else False,
        verification_reason=f"AI Confidence: {payload.confidence}" if payload.confidence else "Manual/AI"
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    # Set spam block for 60 seconds
    cache_set(spam_key, "1", expire=60)
    
    return {"ok": True, "id": new_log.id}
