import json
import numpy as np
from app.services.extract_embeddings import get_embedding
from app.models.employees import Employee
from sqlalchemy.orm import Session
from sqlalchemy import select

def recognize(face_img, db: Session, threshold=0.5):
    # Nhận diện khuôn mặt (One-to-Many)
    # Ngưỡng 0.5
    emb = get_embedding(face_img)
    if emb is None:
        return None, "Unknown", 0

    # Lấy employees có embedding
    stmt = select(Employee).where(Employee.face_embedding.is_not(None))
    employees = db.execute(stmt).scalars().all()

    if not employees:
        return None, "No Registered Faces", 0

    best_score = -1
    best_emp = None
    
    for emp in employees:
        try:
            db_emb = np.array(json.loads(emp.face_embedding))
            # Vì embeddings đã chuẩn hóa, cosine similarity là dot product
            score = np.dot(emb, db_emb)
            if score > best_score:
                best_score = score
                best_emp = emp
        except Exception as e:
            continue

    if best_score >= threshold and best_emp:
        return best_emp.employee_id, best_emp.full_name, best_score
    else:
        return None, "Unknown", best_score

def verify_one_to_one(face_img, target_employee: Employee, threshold=0.5):
    # Xác minh khuôn mặt (One-to-One)
    # Ngưỡng 0.5
    if not target_employee.face_embedding:
        return False, "No registered biometrics", 0

    emb = get_embedding(face_img)
    if emb is None:
        return False, "Camera features error", 0

    try:
        db_emb = np.array(json.loads(target_employee.face_embedding))
        # Vì embeddings đã chuẩn hóa, cosine similarity là dot product
        score = np.dot(emb, db_emb)
        
        if score >= threshold:
            return True, "Identity verified", score
        else:
            return False, f"Lower match (Score: {score:.2f})", score
    except Exception as e:
        return False, "Biometric error", 0
