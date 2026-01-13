from fastapi import Request, HTTPException, status
from app.core.cache import redis_client
import time


async def rate_limit(request: Request, max_requests: int = 100, window: int = 60):
    """
    Middleware giới hạn tần suất yêu cầu (Rate Limiting).
    Mặc định: 100 yêu cầu / 60 giây.
    """
    client_id = request.client.host 
    # Nếu user đã đăng nhập, dùng user id làm định danh
    if hasattr(request.state, "user") and request.state.user:
        client_id = f"user:{request.state.user.id}"
    
    key = f"hrms:ratelimit:{client_id}"
    
    try:
        current = redis_client.get(key)
        
        if current is None:
            # Lần đầu truy cập trong cửa sổ thời gian
            redis_client.setex(key, window, 1)
            return
        
        current = int(current)
        
        if current >= max_requests:
            # Vượt quá giới hạn
            ttl = redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {ttl} seconds."
            )
        
        # Tăng biến đếm
        redis_client.incr(key)
        
    except HTTPException:
        raise
    except Exception:
        # Bỏ qua lỗi kết nối Redis để không làm gián đoạn API
        pass





