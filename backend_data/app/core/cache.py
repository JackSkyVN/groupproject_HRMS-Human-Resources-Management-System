import json
from typing import Any, Optional
import redis
from app.core.config import settings

# Khởi tạo kết nối Redis
redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True,
    health_check_interval=30
)


def get_cache_key(prefix: str, key: str) -> str:
    """Tạo cache key có tiền tố hrms."""
    return f"hrms:{prefix}:{key}"

def cache_get(key: str) -> Optional[Any]:
    """Lấy dữ liệu từ cache."""
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception:
        return None
    return None

def cache_set(key: str, value: Any, expire: int = 300) -> bool:
    """Lưu dữ liệu vào cache với thời gian hết hạn (mặc định 300s)."""
    try:
        redis_client.setex(
            key,
            expire,
            json.dumps(value, default=str)
        )
        return True
    except Exception:
        return False

def cache_delete(key: str) -> bool:
    """Xóa một key khỏi cache."""
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False

def cache_delete_pattern(pattern: str) -> int:
    """Xóa các key khớp với pattern (ví dụ: hrms:*)."""
    try:
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception:
        return 0





