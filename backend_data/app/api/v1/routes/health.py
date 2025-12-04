from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["health"])
def read_health():
    return {"status": "ok"}
