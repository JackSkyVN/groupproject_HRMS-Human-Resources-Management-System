import cv2
import os
from datetime import datetime


def save_snapshot(face_img, employee_id: int, action: str) -> str:
    """
    Lưu ảnh khuôn mặt vào thư mục snapshots.
    
    Args:
        face_img: Ảnh khuôn mặt (numpy array)
        employee_id: ID nhân viên
        action: 'checkin' hoặc 'checkout'
    
    Returns:
        str: Tên file ảnh (không bao gồm đường dẫn)
    """
    # Tạo thư mục nếu chưa tồn tại
    snapshot_dir = "static/snapshots"
    os.makedirs(snapshot_dir, exist_ok=True)
    
    # Tạo tên file: {employee_id}_{action}_{timestamp}.jpg
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{employee_id}_{action}_{timestamp}.jpg"
    filepath = os.path.join(snapshot_dir, filename)
    
    # Lưu ảnh
    try:
        cv2.imwrite(filepath, face_img)
        return filename
    except Exception as e:
        print(f"[ERROR] Failed to save snapshot: {e}")
        return None
