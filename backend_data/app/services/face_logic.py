def estimate_pose(landmarks, conf=0.0, face_width=100):
    if len(landmarks) < 5:
        return "Unknown", {"off": 0, "br": 0, "vrat": 0, "conf": conf}

    # Landmarks: [LEye, REye, Nose, LMouth, RMouth]
    le, re, nose, lm, rm = landmarks[0], landmarks[1], landmarks[2], landmarks[3], landmarks[4]
    
    # 1. Độ lệch ngang
    eye_center_x = (le[0] + re[0]) / 2
    eye_dist = abs(re[0] - le[0])
    if eye_dist < 1: eye_dist = 1
    offset = (nose[0] - eye_center_x) / eye_dist
    
    # 2. Độ rộng
    breadth = eye_dist / face_width
    
    # 3. Tỉ lệ dọc
    eye_y = (le[1] + re[1]) / 2
    mouth_y = (lm[1] + rm[1]) / 2
    upper_face = abs(nose[1] - eye_y)
    lower_face = abs(mouth_y - nose[1])
    if lower_face < 1: lower_face = 1
    vrat = upper_face / lower_face

    pose = "Unknown"
    
    # Neutral: offset < 0.18, breadth > 0.25, vrat 0.5-1.8
    if abs(offset) < 0.18 and breadth > 0.25 and 0.5 < vrat < 1.8:
        pose = "Neutral"
    elif offset < -0.35:
        pose = "Left"
    elif offset > 0.35:
        pose = "Right"
    
    return pose, {
        "off": round(float(offset), 3), 
        "br": round(float(breadth), 2),
        "vrat": round(float(vrat), 2),
        "conf": conf
    }

def detect_blink(landmarks, prev_landmarks):
    if not prev_landmarks or len(landmarks) < 2:
        return False
    curr_y = (landmarks[0][1] + landmarks[1][1]) / 2
    prev_y = (prev_landmarks[0][1] + prev_landmarks[1][1]) / 2
    return abs(curr_y - prev_y) > 3.0
