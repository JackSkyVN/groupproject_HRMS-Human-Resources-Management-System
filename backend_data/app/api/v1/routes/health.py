from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["health"])
def read_health():
    """Health check endpoint."""
    return {"status": "ok"}
