from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db.models import AttendanceLog, AttendanceSnapshot, Employee
from app.core.config import settings
from pathlib import Path
import hashlib
from PIL import Image
import os


class AttendanceValidationService:
    """Service for validating attendance logs and snapshots"""
    
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_attendance_log(self, db: Session, attendance_log_id: int) -> Dict:
        """Validate an attendance log entry."""
        log = db.query(AttendanceLog).filter(AttendanceLog.id == attendance_log_id).first()
        if not log:
            return {"valid": False, "errors": ["Attendance log not found"]}
        
        errors = []
        warnings = []
        
        # Check if check-in time is valid (not in future)
        if log.check_in_time > datetime.now(log.check_in_time.tzinfo):
            errors.append("Check-in time cannot be in the future")
        
        # Check if check-out time is valid
        if log.check_out_time:
            if log.check_out_time <= log.check_in_time:
                errors.append("Check-out time must be after check-in time")
            
            if log.check_out_time > datetime.now(log.check_out_time.tzinfo):
                errors.append("Check-out time cannot be in the future")
        
        # Check if snapshots exist for check-in
        snapshots = db.query(AttendanceSnapshot).filter(
            AttendanceSnapshot.attendance_log_id == attendance_log_id
        ).all()
        
        if not snapshots:
            warnings.append("No photo snapshots found for this attendance log")
        else:
            # Verify all snapshots are from the same day
            log_date = log.check_in_time.date()
            for snapshot in snapshots:
                snapshot_date = snapshot.capture_time.date()
                if snapshot_date != log_date:
                    errors.append(f"Snapshot {snapshot.id} was captured on different day than check-in")
                
                # Check if snapshot file exists
                if not Path(snapshot.image_path).exists():
                    errors.append(f"Snapshot image file not found: {snapshot.image_path}")
        
        # Check verification score if available
        if log.verification_score is not None:
            if log.verification_score < 0.7:  # Threshold for face recognition confidence
                warnings.append(f"Low verification score: {log.verification_score}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "log_id": attendance_log_id,
            "snapshot_count": len(snapshots)
        }
    
    def verify_snapshot_for_date(self, db: Session, employee_id: int, 
                                 check_date: datetime.date) -> Dict:
        """Verify all snapshots for an employee on a specific date."""
        # Get attendance log for the date
        start_datetime = datetime.combine(check_date, datetime.min.time())
        end_datetime = datetime.combine(check_date, datetime.max.time())
        
        attendance_log = db.query(AttendanceLog).filter(
            and_(
                AttendanceLog.employee_id == employee_id,
                AttendanceLog.check_in_time >= start_datetime,
                AttendanceLog.check_in_time <= end_datetime
            )
        ).first()
        
        if not attendance_log:
            return {
                "valid": False,
                "errors": [f"No attendance log found for employee {employee_id} on {check_date}"]
            }
        
        # Get all snapshots for this log
        snapshots = db.query(AttendanceSnapshot).filter(
            AttendanceSnapshot.attendance_log_id == attendance_log.id
        ).all()
        
        if not snapshots:
            return {
                "valid": False,
                "errors": [f"No snapshots found for attendance log {attendance_log.id}"]
            }
        
        validation_results = []
        for snapshot in snapshots:
            result = self.validate_snapshot(db, snapshot.id)
            validation_results.append(result)
        
        all_valid = all(r["valid"] for r in validation_results)
        errors = [e for r in validation_results for e in r.get("errors", [])]
        
        return {
            "valid": all_valid,
            "errors": errors,
            "snapshot_count": len(snapshots),
            "validated_snapshots": validation_results,
            "attendance_log_id": attendance_log.id
        }
    
    def validate_snapshot(self, db: Session, snapshot_id: int) -> Dict:
        """Validate a single attendance snapshot."""
        snapshot = db.query(AttendanceSnapshot).filter(
            AttendanceSnapshot.id == snapshot_id
        ).first()
        
        if not snapshot:
            return {"valid": False, "errors": ["Snapshot not found"]}
        
        errors = []
        warnings = []
        
        # Check if image file exists
        image_path = Path(snapshot.image_path)
        if not image_path.exists():
            errors.append(f"Image file not found: {snapshot.image_path}")
        else:
            # Verify image is valid
            try:
                with Image.open(image_path) as img:
                    img.verify()
                    # Get image properties
                    img = Image.open(image_path)  # Reopen after verify
                    width, height = img.size
                    
                    # Check minimum size requirements
                    if width < 100 or height < 100:
                        warnings.append("Image resolution is very low")
                    
                    # Check file size
                    file_size_mb = image_path.stat().st_size / (1024 * 1024)
                    if file_size_mb > settings.max_upload_size_mb:
                        errors.append(f"Image file size exceeds limit: {file_size_mb}MB")
                    
            except Exception as e:
                errors.append(f"Invalid image file: {str(e)}")
        
        # Check capture time is reasonable (not in future, not too old)
        if snapshot.capture_time > datetime.now(snapshot.capture_time.tzinfo):
            errors.append("Capture time cannot be in the future")
        
        max_age_days = 90
        if snapshot.capture_time < datetime.now() - timedelta(days=max_age_days):
            warnings.append(f"Snapshot is older than {max_age_days} days")
        
        # Check verification score if available
        if snapshot.verification_score is not None:
            if snapshot.verification_score < 0.7:
                warnings.append(f"Low verification score: {snapshot.verification_score}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "snapshot_id": snapshot_id,
            "image_path": snapshot.image_path
        }
    
    def get_snapshots_for_date(self, db: Session, check_date: datetime.date, 
                               employee_id: Optional[int] = None) -> List[AttendanceSnapshot]:
        """Get all snapshots for a specific date, optionally filtered by employee."""
        start_datetime = datetime.combine(check_date, datetime.min.time())
        end_datetime = datetime.combine(check_date, datetime.max.time())
        
        query = db.query(AttendanceSnapshot).filter(
            and_(
                AttendanceSnapshot.capture_time >= start_datetime,
                AttendanceSnapshot.capture_time <= end_datetime
            )
        )
        
        if employee_id:
            query = query.filter(AttendanceSnapshot.employee_id == employee_id)
        
        return query.all()
    
    def calculate_image_hash(self, image_path: str) -> str:
        """Calculate SHA256 hash of an image file for duplicate detection."""
        sha256_hash = hashlib.sha256()
        with open(image_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

