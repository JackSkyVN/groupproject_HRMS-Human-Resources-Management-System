import base64
import json
import cv2
import numpy as np
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.deps import get_current_employee
from app.models.employees import Employee
from app.services.detect_faces import detect_and_crop_faces
from app.services.antispoof import check_liveness
from app.services.recognize import recognize, verify_one_to_one
from app.services.attendance_service import perform_check_in, perform_check_out
from app.services.snapshot_utils import save_snapshot
from app.services.face_logic import estimate_pose
from app.models.face_logs import FaceLog
from app.services.session_manager import session_manager
import time

router = APIRouter()

@router.post("/verify")
async def verify_face(
    image_data: str = Body(..., embed=True),
    intent: str = Body("checkin", embed=True),  # 'checkin' hoặc 'checkout'
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Verify face and perform attendance action."""
    try:
        # Theo dõi session
        session_manager.start_session(
            current_employee.employee_id,
            current_employee.full_name,
            intent
        )
        
        # 1. Giải mã ảnh base64
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # 2. Phát hiện và cắt mặt
        yolo_start = time.time()
        faces_data = detect_and_crop_faces(frame)
        yolo_time = (time.time() - yolo_start) * 1000  # Chuyển sang ms
        
        if not faces_data:
            session_manager.end_session(current_employee.employee_id)
            return {"ok": False, "match": False, "message": "No face detected"}

        # Dùng khuôn mặt lớn nhất
        best_face = sorted(faces_data, key=lambda f: f["face"].shape[0] * f["face"].shape[1], reverse=True)[0]
        face = best_face["face"]
        landmarks = best_face["landmarks"]
        f_w = best_face.get("w", 100)


        # Xác minh 1-1 (ngưỡng 0.5)
        emb_start = time.time()
        is_match, message, score = verify_one_to_one(face, current_employee, threshold=0.25)
        emb_time = (time.time() - emb_start) * 1000  # Chuyển sang ms
        
        # Ghi metrics
        session_manager.add_performance_metric({
            "yolo_time": yolo_time,
            "embedding_time": emb_time,
            "employee_id": current_employee.employee_id
        })
        
        # 4.1 Log kết quả AI
        try:
            detected_pose, diag = estimate_pose(landmarks, best_face["conf"], f_w)
            new_log = FaceLog(
                employee_id=current_employee.employee_id,
                score=float(score),
                pose=detected_pose,
                attempt_type="verify",
                matched=is_match,
                diag_json=diag
            )
            db.add(new_log)
            db.commit()
        except Exception as log_err:
            pass

        if not is_match:
            session_manager.end_session(current_employee.employee_id)
            return {"ok": False, "match": False, "message": message, "score": float(score)}

        # 5. Lưu snapshot
        snapshot_filename = save_snapshot(face, current_employee.employee_id, intent)
        
        # 6. Thực hiện điểm danh
        try:
            if intent == "checkin":
                att_result = perform_check_in(db, current_employee, snapshot_filename, float(score))
            else:
                att_result = perform_check_out(db, current_employee, snapshot_filename, float(score))
            
            # Kết thúc session
            session_manager.end_session(current_employee.employee_id)
            
            return {
                "ok": True, 
                "match": True, 
                "employee_id": current_employee.employee_id, 
                "name": current_employee.full_name, 
                "score": float(score),
                "attendance": att_result
            }
        except ValueError as e:
            # Đã check in/out
            return {
                "ok": True,
                "match": True,
                "employee_id": current_employee.employee_id,
                "name": current_employee.full_name,
                "score": float(score),
                "message": str(e)
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enroll-step")
async def enroll_face_step(
    image_data: str = Body(..., embed=True),
    step_id: str = Body(..., embed=True),  # 'neutral', 'left', 'right', 'complete'
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Validate a specific face enrollment step."""
    from app.services.face_logic import estimate_pose
    from datetime import datetime
    
    try:
        # 0. Kiểm tra nếu đã đăng ký Face ID
        if current_employee.face_registered_at and not current_employee.face_reset_allowed:
            return {
                "ok": False, 
                "message": "Face ID already registered. Please request a reset if needed.",
                "locked": True
            }
        
        # 1. Giải mã
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # 2. Phát hiện mặt
        faces_data = detect_and_crop_faces(frame)
        if not faces_data:
            return {"ok": False, "message": "No face detected"}
        
        # Dùng face đầu tiên
        best_face = faces_data[0]
        face_img = best_face["face"]
        landmarks = best_face["landmarks"]
        conf = best_face["conf"]
        f_w = best_face.get("w", 100)

        # 3. Kiểm tra tư thế (Pose)
        detected_pose, diag = estimate_pose(landmarks, conf, f_w)

        # 3. Xử lý logic từng bước
        if step_id == 'neutral' and detected_pose != 'Neutral':
            return {"ok": False, "message": "LOOK STRAIGHT AT THE CAMERA", "diag": diag}
        if step_id == 'left' and detected_pose != 'Left':
            return {"ok": False, "message": "TURN LEFT MORE", "diag": diag}
        if step_id == 'right' and detected_pose != 'Right':
            return {"ok": False, "message": "TURN RIGHT MORE", "diag": diag}

        # 4. Xử lý thành công
        if step_id == 'complete':
            # Nới lỏng: chấp nhận cả Neutral hoặc Unknown (không phải Left/Right)
            if detected_pose in ['Left', 'Right']:
                return {"ok": False, "message": "Please look straight", "diag": diag}
                
            from app.services.extract_embeddings import get_embedding
            emb = get_embedding(face_img)
            if emb is None:
                return {"ok": False, "message": "Feature extraction failed", "diag": diag}
            
            # Lưu DB
            current_employee.face_embedding = json.dumps(emb.tolist())
            current_employee.face_registered_at = func.now()  # Ghi nhận thời điểm đăng ký thành công
            current_employee.face_reset_allowed = False  # Khóa
            db.add(current_employee)
            db.commit()
            db.refresh(current_employee)
            
            return {"ok": True, "message": "Đăng ký khuôn mặt thành công! 🎉", "diag": diag}

        return {"ok": True, "message": f"Good! Recorded {detected_pose}.", "pose": detected_pose, "diag": diag}

    except Exception as e:
        return {"ok": False, "message": str(e)}

@router.post("/enroll")
async def enroll_face(
    image_data: str = Body(..., embed=True),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Old enrollment fallback."""
    try:
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        faces_data = detect_and_crop_faces(frame)
        if not faces_data:
             raise HTTPException(status_code=400, detail="No face detected")
        
        face = sorted(faces_data, key=lambda f: f["face"].shape[0] * f["face"].shape[1], reverse=True)[0]["face"]
        
        from app.services.extract_embeddings import get_embedding
        emb = get_embedding(face)
        if emb is None:
             raise HTTPException(status_code=500, detail="Extraction failed")

        current_employee.face_embedding = json.dumps(emb.tolist())
        db.commit()
        return {"ok": True, "message": "Success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def fetch_face_logs(
    employee_id: Optional[str] = None,
    employee_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    outcome: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Get recent AI attendance logs with filters."""
    if current_employee.role_id not in [1, 2]:  # Admin, HR Manager
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from sqlalchemy import desc
    from datetime import datetime, timedelta
    
    # Build query
    query = db.query(FaceLog).join(Employee)
    
    # Filter by employee ID or name (combined search)
    if employee_id or employee_name:
        search_term = employee_id or employee_name
        query = query.filter(
            (FaceLog.employee_id.ilike(f"%{search_term}%")) |
            (Employee.full_name.ilike(f"%{search_term}%"))
        )
    
    # Filter by date range
    if date_from:
        date_from_dt = datetime.fromisoformat(date_from.replace('Z', ''))
        query = query.filter(FaceLog.timestamp >= date_from_dt)
    
    if date_to:
        date_to_dt = datetime.fromisoformat(date_to.replace('Z', ''))
        # Include entire day
        query = query.filter(FaceLog.timestamp <= date_to_dt + timedelta(days=1))
    
    # Filter by outcome
    if outcome == "matched":
        query = query.filter(FaceLog.matched == True)
    elif outcome == "rejected":
        query = query.filter(FaceLog.matched == False)
    
    logs = query.order_by(desc(FaceLog.timestamp)).limit(limit).all()
    
    return [
        {
            "id": l.id,
            "employee_id": l.employee_id,
            "employee_name": l.employee.full_name,
            "timestamp": l.timestamp.isoformat(),
            "score": l.score,
            "pose": l.pose,
            "matched": l.matched,
            "diag": l.diag_json
        } for l in logs
    ]

@router.get("/stats")
async def fetch_ai_stats(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Get AI verification statistics."""
    if current_employee.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from sqlalchemy import func
    total_attempts = db.query(FaceLog).count()
    success_rate = db.query(FaceLog).filter(FaceLog.matched == True).count() / total_attempts if total_attempts > 0 else 0
    avg_score = db.query(func.avg(FaceLog.score)).scalar() or 0
    
    return {
        "total_attempts": total_attempts,
        "success_rate": round(success_rate * 100, 1),
        "avg_score": round(float(avg_score), 3)
    }

@router.get("/active-sessions")
async def get_active_sessions(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Get active sessions for current users at cameras."""
    if current_employee.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    sessions = session_manager.get_active_sessions()
    return {
        "active_sessions": sessions,
        "count": len(sessions)
    }

@router.get("/performance-stats")
async def get_performance_stats(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Get system throughput and latency metrics."""
    if current_employee.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    stats = session_manager.get_performance_stats()
    return stats

# ==================== YÊU CẦU RESET FACE ID ====================

@router.post("/face-reset-request")
async def request_face_reset(
    reason: str = Body(..., embed=True),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Submit a Face ID reset request."""
    from app.models.face_reset_requests import FaceResetRequest
    
    # Kiểm tra request pending
    existing = db.query(FaceResetRequest).filter(
        FaceResetRequest.employee_id == current_employee.employee_id,
        FaceResetRequest.status == "pending"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")
    
    # Tạo request mới
    new_request = FaceResetRequest(
        employee_id=current_employee.employee_id,
        reason=reason,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return {"ok": True, "message": "Request submitted successfully", "request_id": new_request.id}

@router.get("/face-reset-requests")
async def get_face_reset_requests(
    status: str = "all",  # all, pending, approved, rejected
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """List pending/processed reset requests."""
    if current_employee.role_id not in [1, 2, 3]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models.face_reset_requests import FaceResetRequest
    
    # SQLAlchemy tự xử lý relationships
    query = db.query(FaceResetRequest)
    
    # L3: Chỉ thấy requests của L4 trong department
    if current_employee.role_id == 3:
        query = query.join(Employee, FaceResetRequest.employee_id == Employee.employee_id)\
                    .filter(Employee.role_id == 4)\
                    .filter(Employee.department_id == current_employee.department_id)
    # L1-2: Thấy tất cả
    
    if status != "all":
        query = query.filter(FaceResetRequest.status == status)
    
    requests = query.order_by(FaceResetRequest.requested_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": r.employee.full_name if r.employee else "Unknown",
            "reason": r.reason,
            "status": r.status,
            "requested_at": r.requested_at.isoformat(),
            "reviewed_by": r.reviewer.full_name if r.reviewer else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "admin_note": r.admin_note
        }
        for r in requests
    ]

@router.get("/face-reset-request/me")
async def get_my_face_reset_status(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Check status of current user's reset request."""
    from app.models.face_reset_requests import FaceResetRequest
    request = db.query(FaceResetRequest).filter(
        FaceResetRequest.employee_id == current_employee.employee_id
    ).order_by(FaceResetRequest.created_at.desc()).first()
    
    if not request:
        return {"has_request": False}
    
    return {
        "has_request": True,
        "status": request.status,
        "created_at": request.created_at,
        "reviewed_at": request.reviewed_at
    }

@router.post("/face-reset-request/{request_id}/approve")
async def approve_face_reset(
    request_id: int,
    admin_note: str = Body(None, embed=True),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Approve a reset request."""
    if current_employee.role_id not in [1, 2, 3]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models.face_reset_requests import FaceResetRequest
    from datetime import datetime
    
    request = db.query(FaceResetRequest).filter(FaceResetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # L3: Chỉ approve L4 trong department
    if current_employee.role_id == 3:
        requester = db.query(Employee).filter(Employee.employee_id == request.employee_id).first()
        if not requester or requester.role_id != 4 or requester.department_id != current_employee.department_id:
            raise HTTPException(status_code=403, detail="You can only approve requests from Level 4 employees in your department")
    # L1-2: Approve all
    
    # Cập nhật trạng thái
    request.status = "approved"
    request.reviewed_by = current_employee.employee_id
    request.reviewed_at = datetime.now()
    request.admin_note = admin_note
    
    # Cho phép đăng ký lại VÀ XÓA HẾT FACE DATA
    employee = db.query(Employee).filter(Employee.employee_id == request.employee_id).first()
    if employee:
        employee.face_reset_allowed = True
        employee.face_registered_at = None  # XÓA timestamp đăng ký
        employee.face_embedding = None  # XÓA face embedding data
        
        # 1. XÓA Face Logs (Nhật ký nhận diện)
        from app.models.face_logs import FaceLog
        db.query(FaceLog).filter(FaceLog.employee_id == employee.employee_id).delete()
        
        # 2. XÓA Face Embeddings từ bảng phụ (nếu có)
        try:
            from app.models.face_embeddings import FaceEmbedding
            db.query(FaceEmbedding).filter(FaceEmbedding.employee_id == employee.employee_id).delete()
        except:
            pass
            
        # 3. XÓA Snapshot paths trong Attendance (Xóa dấu vết ảnh trong DB)
        from app.models.attendance import Attendance
        db.query(Attendance).filter(Attendance.employee_id == employee.employee_id).update({
            "snapshot_checkin": None,
            "snapshot_checkout": None,
            "face_score_checkin": None,
            "face_score_checkout": None
        }, synchronize_session=False)

        # 4. XÓA FILE VẬT LÝ TRÊN ĐĨA (Dọn dẹp triệt để)
        import os
        snapshot_dir = "static/snapshots"
        if os.path.exists(snapshot_dir):
            try:
                # Tìm các file bắt đầu bằng "{employee_id}_"
                prefix = f"{employee.employee_id}_"
                for filename in os.listdir(snapshot_dir):
                    if filename.startswith(prefix):
                        file_path = os.path.join(snapshot_dir, filename)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            print(f"[PURGE] Deleted physical snapshot: {file_path}")
            except Exception as disk_err:
                print(f"[PURGE] Error deleting files: {disk_err}")

    db.commit()
    
    return {"ok": True, "message": "Request approved"}

@router.post("/face-reset-request/{request_id}/reject")
async def reject_face_reset(
    request_id: int,
    admin_note: str = Body(..., embed=True),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Reject a reset request."""
    if current_employee.role_id not in [1, 2, 3]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models.face_reset_requests import FaceResetRequest
    from datetime import datetime
    
    request = db.query(FaceResetRequest).filter(FaceResetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # L3: Chỉ reject L4 trong department
    if current_employee.role_id == 3:
        requester = db.query(Employee).filter(Employee.employee_id == request.employee_id).first()
        if not requester or requester.role_id != 4 or requester.department_id != current_employee.department_id:
            raise HTTPException(status_code=403, detail="You can only reject requests from Level 4 employees in your department")
    # L1-2: Reject all
    
    # Cập nhật trạng thái
    request.status = "rejected"
    request.reviewed_by = current_employee.employee_id
    request.reviewed_at = datetime.now()
    request.admin_note = admin_note
    
    db.commit()
    
    return {"ok": True, "message": "Request rejected"}

@router.post("/employee/{employee_id}/force-reset-face")
async def force_reset_face_id(
    employee_id: int,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Force clear someone's Face ID."""
    if current_employee.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Reset Face ID
    employee.face_embedding = None
    employee.face_registered_at = None
    employee.face_reset_allowed = True
    
    db.commit()
    
    return {"ok": True, "message": f"Face ID reset for {employee.full_name}"}
