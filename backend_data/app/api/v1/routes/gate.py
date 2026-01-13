import base64
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.deps import get_current_employee, require_role_level
from app.models.employees import Employee
from app.models.gate_log import GateLog
from app.services.recognize import recognize
from app.services.snapshot_utils import save_snapshot
from app.services.detect_faces import detect_and_crop_faces

router = APIRouter()


@router.post("/gate/recognize")
async def gate_recognize(
    image_data: str = Body(..., embed=True),
    direction: str = Body("entry", embed=True),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role_level(2))
):
    """
    Nhận diện khuôn mặt tại cổng và ghi log vào/ra.
    
    - **image_data**: Base64 encoded image
    - **direction**: 'entry' hoặc 'exit'
    - Chỉ Admin (L1) và HR Manager (L2) được phép sử dụng
    """
    try:
        # 1. Giải mã ảnh base64
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # 2. Phát hiện khuôn mặt
        faces_data = detect_and_crop_faces(frame)
        if not faces_data:
            return {
                "success": False,
                "message": "No face detected",
                "employee_id": None,
                "name": "No Face",
                "score": 0,
                "recognized": False
            }
        
        # Lấy khuôn mặt lớn nhất
        best_face = sorted(faces_data, key=lambda f: f["face"].shape[0] * f["face"].shape[1], reverse=True)[0]
        face = best_face["face"]
        
        # 3. Nhận diện (One-to-Many)
        emp_id, name, score = recognize(face, db, threshold=0.5)
        
        # 4. Lưu snapshot
        snapshot_filename = save_snapshot(
            face, 
            emp_id or 999999,  # Use dummy ID for unknown
            f"gate_{direction}"
        )
        
        # 5. Tạo log trong database
        gate_log = GateLog(
            employee_id=emp_id,
            employee_name=name,
            direction=direction,
            face_score=float(score) if score else None,
            snapshot_path=snapshot_filename,
            recognized=(emp_id is not None)
        )
        db.add(gate_log)
        db.commit()
        db.refresh(gate_log)
        
        return {
            "success": True,
            "employee_id": emp_id,
            "name": name,
            "score": float(score) if score else 0,
            "timestamp": gate_log.timestamp.isoformat(),
            "snapshot": snapshot_filename,
            "recognized": emp_id is not None,
            "log_id": gate_log.log_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gate/logs")
async def get_gate_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role_level(2))
):
    """
    Lấy danh sách logs gần đây tại cổng.
    
    - **limit**: Số lượng records tối đa (default: 50)
    - Chỉ Admin (L1) và HR Manager (L2) được phép xem
    """
    try:
        logs = db.query(GateLog)\
            .order_by(GateLog.timestamp.desc())\
            .limit(min(limit, 200))\
            .all()
        
        return [
            {
                "log_id": log.log_id,
                "employee_id": log.employee_id,
                "employee_name": log.employee_name or "Unknown",
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "direction": log.direction,
                "face_score": float(log.face_score) if log.face_score else 0,
                "snapshot_path": log.snapshot_path,
                "recognized": log.recognized
            }
            for log in logs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gate/stats")
async def get_gate_stats(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role_level(2))
):
    """
    Thống kê hoạt động tại cổng hôm nay.
    """
    from datetime import date
    from sqlalchemy import func
    
    today = date.today()
    
    # Count logs today
    total_today = db.query(func.count(GateLog.log_id))\
        .filter(func.date(GateLog.timestamp) == today)\
        .scalar()
    
    recognized_today = db.query(func.count(GateLog.log_id))\
        .filter(func.date(GateLog.timestamp) == today)\
        .filter(GateLog.recognized == True)\
        .scalar()
    
    unknown_today = total_today - recognized_today if total_today else 0
    
    return {
        "date": today.isoformat(),
        "total": total_today or 0,
        "recognized": recognized_today or 0,
        "unknown": unknown_today
    }
