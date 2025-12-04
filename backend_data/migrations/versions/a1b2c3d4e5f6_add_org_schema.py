"""add org schema: departments, positions, employees

Revision ID: a1b2c3d4e5f6
Revises: 611e9e1b813e
Create Date: 2025-11-13
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '611e9e1b813e'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=True),
        sa.Column('level', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_departments_name', 'departments', ['name'], unique=True)
    op.create_index('ix_departments_parent_id', 'departments', ['parent_id'])

    op.create_table(
        'positions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_positions_name', 'positions', ['name'], unique=True)

    op.create_table(
        'employees',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=True),
        sa.Column('position_id', sa.Integer(), sa.ForeignKey('positions.id'), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('phone', sa.String(length=255), nullable=True),
        sa.Column('important_employee', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_employees_user_id', 'employees', ['user_id'], unique=True)
    op.create_index('ix_employees_department_id', 'employees', ['department_id'])
    op.create_index('ix_employees_position_id', 'employees', ['position_id'])
    op.create_index('ix_employees_important_employee', 'employees', ['important_employee'])


def downgrade() -> None:
    op.drop_index('ix_employees_important_employee', table_name='employees')
    op.drop_index('ix_employees_position_id', table_name='employees')
    op.drop_index('ix_employees_department_id', table_name='employees')
    op.drop_index('ix_employees_user_id', table_name='employees')
    op.drop_table('employees')

    op.drop_index('ix_positions_name', table_name='positions')
    op.drop_table('positions')

    op.drop_index('ix_departments_parent_id', table_name='departments')
    op.drop_index('ix_departments_name', table_name='departments')
    op.drop_table('departments')
