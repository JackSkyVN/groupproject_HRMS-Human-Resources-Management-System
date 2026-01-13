# src/extract_embeddings.py
import cv2
import numpy as np
import onnxruntime as ort
import os

# === Load ArcFace model ===
_current_dir = os.path.dirname(os.path.abspath(__file__))
# Tìm đường dẫn model
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(_current_dir)))
_backend_models = os.path.join(os.path.dirname(os.path.dirname(_current_dir)), "models")
_root_models = os.path.join(_project_root, "models")

MODEL_FILENAME = "w600k_r50.onnx"

def get_model_path():
    # Thử root trước
    path = os.path.join(_root_models, MODEL_FILENAME)
    if os.path.exists(path):
        return path
    # Thử backend nếu không có
    path = os.path.join(_backend_models, MODEL_FILENAME)
    return path

session = None
input_name = None

def get_session():
    global session, input_name
    if session is None:
        path = get_model_path()
        if not os.path.exists(path):
             print(f"\n[CRITICAL ERROR] ArcFace model NOT FOUND at: {os.path.abspath(path)}")
             print(f"Please ensure you have placed '{MODEL_FILENAME}' in '{os.path.abspath(_root_models)}' or '{os.path.abspath(_backend_models)}'.\n")
             raise FileNotFoundError(f"Model file missing: {path}")
             
        # Kiểm tra LFS pointers
        if os.path.getsize(path) < 1000:
            print(f"\n[WARNING] Detected very small model file ({os.path.getsize(path)} bytes) at {path}.")
            print("This is likely a Git LFS placeholder. Please ensure you have the full binary model file.\n")
            
        session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
    return session, input_name


def preprocess_face(face_img):
    """
    Preprocess face image for ArcFace model.
    Input: BGR image (numpy)
    Output: tensor (1, 3, 112, 112)
    """
    face = cv2.resize(face_img, (112, 112))
    face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    face = (face / 127.5 - 1.0).astype(np.float32)
    face = np.transpose(face, (2, 0, 1))  # (HWC → CHW)
    face = np.expand_dims(face, axis=0)   # (1, 3, 112, 112)
    return face

def get_embedding(face_img):
    """
    Extract face embedding from face image.
    Input: face_img (numpy BGR)
    Output: 512-dimensional vector (numpy)
    """
    try:
        sess, inp_name = get_session()
        input_blob = preprocess_face(face_img)
        emb = sess.run(None, {inp_name: input_blob})[0].flatten()
        emb = emb / np.linalg.norm(emb)  # chuẩn hóa vector để so cosine similarity
        return emb
    except Exception as e:
        print(f"[ERROR] Embedding extraction failed: {e}")
        return None



