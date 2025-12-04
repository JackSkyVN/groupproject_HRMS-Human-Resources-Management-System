"""
Import organization data (departments, positions, users, employees) from a MySQL dump file
that contains INSERT statements for a table named `dulieu_excel` with columns:
  Employee ID, Full Name, Position, Department, Date of Birth, Phone/ID, Username, Password

This script parses the INSERT VALUES tuples directly (no MySQL server required),
creates departments and positions by distinct values, creates users with bcrypt-hashed
passwords (never storing plaintext), and creates employees linked to users.

Usage:
  python scripts/import_org_from_mysql.py backups/Dump20251111.sql

Idempotent: running multiple times will upsert by unique keys (department.name, position.name, user.email/username).
"""
from __future__ import annotations
import re
import sys
import csv
from io import StringIO
from datetime import datetime, date
from typing import List, Dict, Any, Tuple

from passlib.context import CryptContext

from app.core.database import SessionLocal
from app.models.rbac import User
from app.models.org import Department, Position, Employee

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def parse_mysql_insert_values(sql_text: str) -> List[Tuple[Any, ...]]:
    # Find the INSERT INTO `dulieu_excel` VALUES (...),(...);
    # Capture inside the parentheses, respecting quotes and escapes (simplified for typical dumps)
    m = re.search(r"INSERT INTO `dulieu_excel` VALUES (.*?);", sql_text, re.S)
    if not m:
        return []
    values_blob = m.group(1).strip()

    # Split top-level tuples: '(...),(...)' into ['(...)','(...)']
    tuples: List[str] = []
    depth = 0
    start = None
    for i, ch in enumerate(values_blob):
        if ch == '(':
            if depth == 0:
                start = i
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0 and start is not None:
                tuples.append(values_blob[start : i + 1])
        # commas at depth 0 separate tuples; handled implicitly by capturing on depth transitions

    rows: List[Tuple[Any, ...]] = []
    for tup in tuples:
        inner = tup[1:-1]  # remove parentheses
        # Use CSV reader with MySQL-like quoting: single-quote strings, backslash escapes
        reader = csv.reader(StringIO(inner), delimiter=',', quotechar="'", escapechar='\\')
        parsed = next(reader)
        # Normalize tokens: strip surrounding whitespace for non-quoted tokens
        tokens = [tok.strip() for tok in parsed]
        norm: List[Any] = []
        for f in tokens:
            if f.upper() == 'NULL':
                norm.append(None)
            else:
                # try int, else keep string
                try:
                    norm.append(int(f))
                except ValueError:
                    norm.append(f)
        # Guard: we expect exactly 8 columns; if more, keep only first 8
        if len(norm) < 8:
            # pad with None if somehow fewer columns
            norm = norm + [None] * (8 - len(norm))
        elif len(norm) > 8:
            norm = norm[:8]
        rows.append(tuple(norm))
    return rows


def coerce_date(s: str | None) -> date | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def email_from_username(u) -> str:
    # Accept any type; cast to string and normalize
    s = str(u).strip() if u is not None else ''
    if not s:
        return "user@example.com"
    if '@' in s:
        return s
    return f"{s}@example.com"


def main(path: str) -> None:
    with open(path, 'r', encoding='utf-8') as f:
        sql = f.read()

    rows = parse_mysql_insert_values(sql)
    if not rows:
        print("No rows found in INSERT for dulieu_excel.")
        return

    # Column order from dump: Employee ID, Full Name, Position, Department, Date of Birth, Phone/ID, Username, Password
    db = SessionLocal()
    try:
        dept_cache: Dict[str, Department] = {}
        pos_cache: Dict[str, Position] = {}

        for r in rows:
            emp_id, full_name, position, department, dob, phone, username, password = r
            dept = None
            if department:
                if department not in dept_cache:
                    dept_obj = db.query(Department).filter(Department.name == department).one_or_none()
                    if not dept_obj:
                        dept_obj = Department(name=department)
                        db.add(dept_obj)
                        db.flush()
                    dept_cache[department] = dept_obj
                dept = dept_cache[department]

            pos = None
            if position:
                if position not in pos_cache:
                    pos_obj = db.query(Position).filter(Position.name == position).one_or_none()
                    if not pos_obj:
                        pos_obj = Position(name=position)
                        db.add(pos_obj)
                        db.flush()
                    pos_cache[position] = pos_obj
                pos = pos_cache[position]

            email = email_from_username(username or f"user{emp_id}")
            user = db.query(User).filter(User.email == email).one_or_none()
            if not user:
                # Ensure a password exists; hash securely
                pw = password or "ChangeMe123!"
                hashed = pwd_context.hash(pw)
                user = User(email=email, hashed_password=hashed)
                db.add(user)
                db.flush()

            # Upsert employee row by user_id
            emp = db.query(Employee).filter(Employee.user_id == user.id).one_or_none()
            if not emp:
                emp = Employee(user_id=user.id)
            emp.department_id = dept.id if dept else None
            emp.position_id = pos.id if pos else None
            emp.date_of_birth = coerce_date(dob)
            emp.phone = str(phone) if phone is not None else None
            # mark important employees if position contains keywords (customize as needed)
            important = False
            if isinstance(position, str):
                keywords = ["Director", "Chief", "Head", "Chairman"]
                important = any(k.lower() in position.lower() for k in keywords)
            emp.important_employee = important

            db.add(emp)
        db.commit()
        print(f"Imported {len(rows)} rows (users/employees/refs upserted).")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_org_from_mysql.py <path-to-dump.sql>")
        sys.exit(1)
    main(sys.argv[1])
