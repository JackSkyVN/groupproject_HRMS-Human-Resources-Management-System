"""add useful indexes

Revision ID: 611e9e1b813e
Revises: c5c2644b149a
Create Date: 2025-11-12 11:30:26.050204

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '611e9e1b813e'
down_revision: Union[str, None] = 'c5c2644b149a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # permissions
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)

    # attendance_logs
    op.create_index("ix_attendance_logs_user_id", "attendance_logs", ["user_id"], unique=False)
    op.create_index("ix_attendance_logs_check_in_time", "attendance_logs", ["check_in_time"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_attendance_logs_check_in_time", table_name="attendance_logs")
    op.drop_index("ix_attendance_logs_user_id", table_name="attendance_logs")
    op.drop_index("ix_permissions_code", table_name="permissions")
    op.drop_index("ix_users_email", table_name="users")
