---
description: Start the HRMS Backend and Frontend servers
---

### 1. Chạy Backend (Cổng 8000)
**Đường dẫn**: `c:\Group Project\groupproject_HRMS-Human-Resources-Management-System\backend_data`
**Lệnh Reset (Chỉ chạy khi muốn đưa về 5 người)**:
```powershell
python reset_db.py
```
**Lệnh chạy server**:
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Chạy Frontend (Cổng 8080)
**Đường dẫn**: `c:\Group Project\groupproject_HRMS-Human-Resources-Management-System\frontend`
**Lệnh chạy**:
```powershell
cd "c:\Group Project\groupproject_HRMS-Human-Resources-Management-System\frontend"
python -m http.server 8080
```

**Lưu ý quan trọng**:
- Đảm bảo cơ sở dữ liệu PostgreSQL và Redis đã được bật.
- Truy cập vào [http://localhost:8080/Login%20screen/index.html](http://localhost:8080/Login%20screen/index.html) để bắt đầu.
