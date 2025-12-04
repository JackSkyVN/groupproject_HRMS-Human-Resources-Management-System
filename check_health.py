import requests
import socket
import sys
import time

def check_port(host, port, service_name):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"✅ {service_name} is running on {host}:{port}")
            return True
    except (socket.timeout, ConnectionRefusedError):
        print(f"❌ {service_name} is NOT running on {host}:{port}")
        return False

def check_http(url, service_name):
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            print(f"✅ {service_name} is reachable at {url}")
            return True
        else:
            print(f"⚠️ {service_name} returned status {response.status_code} at {url}")
            return True # Still running, just maybe auth error or 404
    except requests.exceptions.ConnectionError:
        print(f"❌ {service_name} is NOT reachable at {url}")
        return False

print("--- HRMS System Health Check ---")
print("Checking components...")

all_ok = True

# 1. Check Postgres (Port 5432)
if not check_port("localhost", 5432, "Database (Postgres)"):
    all_ok = False

# 2. Check Redis (Port 6379)
if not check_port("localhost", 6379, "Cache (Redis)"):
    all_ok = False

# 3. Check Backend (Port 8000)
if not check_http("http://localhost:8000/docs", "Backend API"):
    all_ok = False

# 4. Check Frontend (Port 3000)
if not check_http("http://localhost:3000", "Frontend Web Server"):
    all_ok = False

print("\n--- Result ---")
if all_ok:
    print("🎉 All systems are GO! You are ready to test the full project.")
    print("Run 'python main.py' in a new terminal to start the AI.")
else:
    print("⚠️ Some components are missing. Please check the terminals.")
