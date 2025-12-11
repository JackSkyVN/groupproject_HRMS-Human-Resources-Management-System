"""Redis caching utilities for performance optimization."""
import json
from typing import Any, Optional
import redis
from app.core.config import settings

# Client Redis với cơ chế pooling kết nối

redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True,
    health_check_interval=30
)


def get_cache_key(prefix: str, key: str) -> str:
    """Generate cache key with prefix."""
    return f"hrms:{prefix}:{key}"


def cache_get(key: str) -> Optional[Any]:
    """Get value from cache."""
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception:
        return None
    return None


def cache_set(key: str, value: Any, expire: int = 300) -> bool:
    """Set value in cache with expiration (default 5 minutes)."""
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
    """Delete key from cache."""
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False


def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching pattern."""
    try:
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception:
        return 0





