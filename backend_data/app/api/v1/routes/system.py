from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import require_permission
from app.core.database import get_db
from app.models.attendance import Attendance
from app.tasks.backup import nightly_backup

router = APIRouter()

@router.post("/system/reset", dependencies=[Depends(require_permission("system.reset"))])
def system_reset(db: Session = Depends(get_db)):
    # Xóa nhật ký điểm danh
    deleted = db.query(Attendance).delete(synchronize_session=False)
    db.commit()
    nightly_backup.delay()
    return {"deleted_rows": int(deleted), "backup_enqueued": True}
