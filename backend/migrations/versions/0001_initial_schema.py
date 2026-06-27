"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sku", sa.Text()),
        sa.Column("barcode", sa.Text()),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category", sa.Text()),
        sa.Column("description", sa.Text()),
        sa.Column("public_description", sa.Text()),
        sa.Column("image_url", sa.Text()),
        sa.Column("price_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "quantity_on_hand",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("reorder_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_name", sa.Text()),
        sa.Column("payment_type", sa.Text()),
        sa.Column("sale_source", sa.Text(), nullable=False, server_default="pos"),
        sa.Column("subtotal_cents", sa.Integer()),
        sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "tax_rate_percent",
            sa.Numeric(8, 3),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "rounding_adjustment_cents",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("order_number", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("location", sa.Text()),
        sa.Column("description", sa.Text()),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date()),
        sa.Column("image_url", sa.Text()),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "inventory_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey("products.id"),
            nullable=False,
        ),
        sa.Column("quantity_change", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "sale_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "sale_id",
            sa.Integer(),
            sa.ForeignKey("sales.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
    )

    op.create_table(
        "event_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "product_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "online_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_name", sa.Text()),
        sa.Column("customer_email", sa.Text()),
        sa.Column("shipping_name", sa.Text()),
        sa.Column("shipping_address_line1", sa.Text()),
        sa.Column("shipping_address_line2", sa.Text()),
        sa.Column("shipping_city", sa.Text()),
        sa.Column("shipping_state", sa.Text()),
        sa.Column("shipping_postal_code", sa.Text()),
        sa.Column("shipping_country", sa.Text()),
        sa.Column("payment_provider", sa.Text()),
        sa.Column("payment_reference", sa.Text()),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id")),
        sa.Column("carrier", sa.Text()),
        sa.Column("tracking_id", sa.Text()),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="pending_packaging",
        ),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shipping_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "tax_rate_percent",
            sa.Numeric(8, 3),
            nullable=False,
            server_default="0",
        ),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("packaged_at", sa.DateTime()),
        sa.Column("shipped_at", sa.DateTime()),
        sa.Column("archived_at", sa.DateTime()),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "online_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "order_id",
            sa.Integer(),
            sa.ForeignKey("online_orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id")),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("online_order_items")
    op.drop_table("online_orders")
    op.drop_table("product_images")
    op.drop_table("event_images")
    op.drop_table("sale_items")
    op.drop_table("inventory_transactions")
    op.drop_table("events")
    op.drop_table("sales")
    op.drop_table("products")
    op.drop_table("app_settings")
