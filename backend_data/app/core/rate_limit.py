"""Rate limiting middleware to prevent abuse."""
from fastapi import Request, HTTPException, status
from app.core.cache import redis_client
import time


async def rate_limit(request: Request, max_requests: int = 100, window: int = 60):
    """
    Rate limiting middleware.
    
    Args:
        max_requests: Maximum requests per window
        window: Time window in seconds (default 60 = 1 minute)
    
    Raises:
        HTTPException: If rate limit exceeded
    """
    # Get client identifier (IP address or user ID)
    client_id = request.client.host
    
    # For authenticated users, use user ID instead
    if hasattr(request.state, "user") and request.state.user:
        client_id = f"user:{request.state.user.id}"
    
    key = f"hrms:ratelimit:{client_id}"
    
    try:
        # Get current request count
        current = redis_client.get(key)
        
        if current is None:
            # First request in window
            redis_client.setex(key, window, 1)
            return
        
        current = int(current)
        
        if current >= max_requests:
            # Rate limit exceeded
            ttl = redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {ttl} seconds."
            )
        
        # Increment counter
        redis_client.incr(key)
        
    except HTTPException:
        raise
    except Exception:
        # If Redis fails, allow request (fail open)
        pass





