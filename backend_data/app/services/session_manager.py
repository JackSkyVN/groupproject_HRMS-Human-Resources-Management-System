import time
from typing import Dict, List, Optional
from datetime import datetime

class SessionManager:
    def __init__(self):
        self.active_sessions: Dict[int, dict] = {}  # employee_id -> session_data
        self.performance_metrics: List[dict] = []
        self.max_metrics_history = 100
    
    def start_session(self, employee_id: int, employee_name: str, intent: str):
        self.active_sessions[employee_id] = {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "intent": intent,
            "start_time": time.time(),
            "timestamp": datetime.now().isoformat()
        }
    
    def end_session(self, employee_id: int):
        if employee_id in self.active_sessions:
            del self.active_sessions[employee_id]
    
    def get_active_sessions(self) -> List[dict]:
        current_time = time.time()
        # Tự động dọn dẹp sessions quá 30 giây
        expired = [emp_id for emp_id, data in self.active_sessions.items() 
                   if current_time - data["start_time"] > 30]
        for emp_id in expired:
            del self.active_sessions[emp_id]
        
        return list(self.active_sessions.values())
    
    def add_performance_metric(self, metric_data: dict):
        metric_data["timestamp"] = datetime.now().isoformat()
        self.performance_metrics.append(metric_data)
        
        # Giữ lại N metrics cuối
        if len(self.performance_metrics) > self.max_metrics_history:
            self.performance_metrics = self.performance_metrics[-self.max_metrics_history:]
    
    def get_performance_stats(self) -> dict:
        if not self.performance_metrics:
            return {
                "avg_fps": 0,
                "avg_yolo_time": 0,
                "avg_embedding_time": 0,
                "total_requests": 0
            }
        
        recent_metrics = self.performance_metrics[-20:]  # 20 requests cuối
        
        avg_yolo = sum(m.get("yolo_time", 0) for m in recent_metrics) / len(recent_metrics)
        avg_emb = sum(m.get("embedding_time", 0) for m in recent_metrics) / len(recent_metrics)
        
        # Tính FPS dựa trên tần suất request
        if len(recent_metrics) >= 2:
            time_span = (datetime.fromisoformat(recent_metrics[-1]["timestamp"]) - 
                        datetime.fromisoformat(recent_metrics[0]["timestamp"])).total_seconds()
            fps = len(recent_metrics) / time_span if time_span > 0 else 0
        else:
            fps = 0
        
        return {
            "avg_fps": round(fps, 1),
            "avg_yolo_time": round(avg_yolo, 2),
            "avg_embedding_time": round(avg_emb, 2),
            "total_requests": len(self.performance_metrics)
        }

# Global instance
session_manager = SessionManager()
