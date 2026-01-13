from ultralytics import YOLO
import cv2
import numpy as np
import os

# Model instance lưu trữ
_model = None

def load_antispoof_model():
    global _model
    if _model is not None:
        return _model
        
# Tìm đường dẫn model: kiểm tra cả root models/ và backend_data/models/
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(_current_dir)))
_backend_models = os.path.join(os.path.dirname(os.path.dirname(_current_dir)), "models")
_root_models = os.path.join(_project_root, "models")

MODEL_FILENAME = "anticheking.pt"

def get_model_path():
    # Thử root trước
    path = os.path.join(_root_models, MODEL_FILENAME)
    if os.path.exists(path):
        return path
    # Thử backend nếu không có
    path = os.path.join(_backend_models, MODEL_FILENAME)
    return path

def load_antispoof_model():
    global _model
    if _model is not None:
        return _model
        
    path = get_model_path()
    if not os.path.exists(path):
        print(f"\n[CRITICAL ERROR] Anti-spoof model NOT FOUND at: {os.path.abspath(path)}")
        print(f"Please ensure you have placed '{MODEL_FILENAME}' in '{os.path.abspath(_root_models)}' or '{os.path.abspath(_backend_models)}'.\n")
        return None
        
    # Kiểm tra LFS pointers/files nhỏ
    if os.path.getsize(path) < 1000:
        print(f"\n[WARNING] Detected very small model file ({os.path.getsize(path)} bytes) at {path}.")
        print("This is likely a Git LFS placeholder. Please ensure you have the full binary model file.\n")
        
    try:
        _model = YOLO(path)
        print(f"[INFO] Anti-spoofing YOLO model loaded from {path}")
        return _model
    except Exception as e:
        print(f"[ERROR] Failed to load anti-spoof model: {e}")
        return None


def check_liveness(face_img, threshold=0.5):
    # Input: face_img (numpy array, BGR từ OpenCV)
    # Output: True nếu thật, False nếu giả
    model = load_antispoof_model()
    if model is None:
        # Nếu thiếu model, cho phép để tránh hệ thống bị lỗi hoàn toàn
        return True 

    try:
        # Chuyển sang RGB vì YOLO cần RGB
        img_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        results = model.predict(source=img_rgb, verbose=False)

        if not results or len(results[0].boxes) == 0:
            return True  # Nếu không phát hiện box, giả sử OK

        boxes = results[0].boxes
        conf = boxes.conf.cpu().numpy()[0]
        cls = int(boxes.cls.cpu().numpy()[0])
        names = results[0].names
        label = names[cls].lower()

        if label == "fake" and conf > threshold:
            return False
        return True

    except Exception as e:
        return True
