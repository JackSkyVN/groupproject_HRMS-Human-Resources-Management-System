from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.departments import Department
from app.models.positions import Position
from app.models.roles import Role

# PUBLIC router - NO AUTHENTICATION REQUIRED
router = APIRouter()

@router.get("/departments")
async def get_departments(db: Session = Depends(get_db)):
    """Public endpoint for department list"""
    depts = db.query(Department).all()
    return [{
        "department_id": d.department_id,
        "department_name": d.department_name,
        "department_code": d.department_code
    } for d in depts]

@router.get("/positions")
async def get_positions(db: Session = Depends(get_db)):
    """Public endpoint for position list"""  
    positions = db.query(Position).all()
    return [{
        "position_id": p.position_id,
        "position_name": p.position_name
    } for p in positions]

@router.get("/roles")
async def get_roles(db: Session = Depends(get_db)):
    """Public endpoint for roles list"""
    roles = db.query(Role).all()
    return [{
        "role_id": r.role_id,
        "role_name": r.role_name,
        "role_level": r.role_level
    } for r in roles]
