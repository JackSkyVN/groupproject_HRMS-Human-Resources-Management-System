import cv2
from ultralytics import YOLO

import os

# Tìm đường dẫn model
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(_current_dir)))
_backend_models = os.path.join(os.path.dirname(os.path.dirname(_current_dir)), "models")
_root_models = os.path.join(_project_root, "models")

MODEL_FILENAME = "yolov8n-face-lindevs.pt"

def get_model_path():
    # Thử root trước
    path = os.path.join(_root_models, MODEL_FILENAME)
    if os.path.exists(path):
        return path
    # Thử backend nếu không có
    path = os.path.join(_backend_models, MODEL_FILENAME)
    return path

yolo = None

def get_yolo():
    global yolo
    if yolo is None:
        path = get_model_path()
        if not os.path.exists(path):
            print(f"\n[CRITICAL ERROR] YOLO Face model NOT FOUND at: {os.path.abspath(path)}")
            print(f"Please ensure you have placed '{MODEL_FILENAME}' in '{os.path.abspath(_root_models)}' or '{os.path.abspath(_backend_models)}'.\n")
            raise FileNotFoundError(f"Model file missing: {path}")
            
        # Kiểm tra LFS pointers
        if os.path.getsize(path) < 1000:
            print(f"\n[WARNING] Detected very small model file ({os.path.getsize(path)} bytes) at {path}.")
            print("This is likely a Git LFS placeholder. Please ensure you have the full binary model file.\n")
            
        yolo = YOLO(path)
    return yolo

def detect_and_crop_faces(frame):
    model = get_yolo()
    results = model(frame, verbose=False)
    faces_data = []

    for r in results:
        boxes = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        keypoints = r.keypoints.xy.cpu().numpy() if r.keypoints is not None else []
        
        for i, box in enumerate(boxes):
            conf = float(confs[i])
            if conf < 0.4: continue # Maximum sensitivity for dark faces
            
            x1, y1, x2, y2 = map(int, box[:4])
            w, h = x2 - x1, y2 - y1
            if w < 40 or h < 40: continue # Very lenient size
           
            face = frame[y1:y2, x1:x2]
            landmarks = keypoints[i] if len(keypoints) > i else []
            
            if face.size > 0:
                faces_data.append({
                    "face": face,
                    "landmarks": landmarks,
                    "conf": round(conf, 2),
                    "w": w
                })

    return faces_data


if __name__ == "__main__":
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        faces = detect_and_crop_faces(frame)

        # draw bounding boxes for debug
        results = yolo(frame)
        annotated = results[0].plot()

        cv2.imshow("YOLO Face Detection", annotated)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
