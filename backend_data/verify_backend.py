import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login to get token (assuming admin exists or we need to create one)
# For this test, we might need to skip auth or assume a default user.
# Let's try to login with default credentials if they exist, or just print what needs to be done.

print("To verify, please ensure the backend is running: uvicorn app.main:app --reload")
print("\n--- Verification Steps ---")

def test_checkin():
    print("\n1. Testing AI Check-in...")
    url = f"{BASE_URL}/attendance/check-in"
    payload = {
        "user_id": 1,
        "timestamp": datetime.now().isoformat(),
        "confidence": 0.95,
        "snapshot_path": "/tmp/face.jpg"
    }
    # Note: This will fail with 401 if not authenticated, but we just want to see if the endpoint exists.
    # Ideally we should pass a token.
    try:
        res = requests.post(url, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_checkin()
