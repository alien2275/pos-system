import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text

app = FastAPI(title="POS API")

DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_NAME = os.getenv("POSTGRES_DB")
DB_HOST = os.getenv("POSTGRES_HOST", "postgres")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:5432/{DB_NAME}"

engine = create_engine(DATABASE_URL)


class ProductCreate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    price_cents: int = 0
    cost_cents: int = 0
    quantity_on_hand: int = 0


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    cost_cents: Optional[int] = None
    quantity_on_hand: Optional[int] = None
    is_active: Optional[bool] = None

class InventoryAdjustment(BaseModel):
    product_id: int
    quantity_change: int
    reason: str
    notes: Optional[str] = None


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "POS API"
    }


@app.get("/products")
def get_products():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM products ORDER BY id;")
        )

        return [
            dict(row._mapping)
            for row in result
        ]


@app.get("/products/search/{query}")
def search_products(query: str):
    search_term = f"%{query}%"

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE
                    name ILIKE :search
                    OR sku ILIKE :search
                    OR barcode ILIKE :search
                    OR description ILIKE :search
                ORDER BY name;
                """
            ),
            {"search": search_term},
        )

        return [
            dict(row._mapping)
            for row in result
        ]


@app.get("/products/barcode/{barcode}")
def get_product_by_barcode(barcode: str):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE barcode = :barcode
                """
            ),
            {"barcode": barcode},
        ).first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return dict(result._mapping)


@app.get("/products/sku/{sku}")
def get_product_by_sku(sku: str):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE sku = :sku
                """
            ),
            {"sku": sku},
        ).first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return dict(result._mapping)


@app.get("/products/{product_id}")
def get_product_by_id(product_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE id = :id
                """
            ),
            {"id": product_id},
        ).first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return dict(result._mapping)


@app.get("/inventory/history/{product_id}")
def get_inventory_history(product_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM inventory_transactions
                WHERE product_id = :product_id
                ORDER BY created_at DESC;
                """
            ),
            {"product_id": product_id},
        )

        return [
            dict(row._mapping)
            for row in result
        ]
    

@app.post("/inventory/adjust")
def adjust_inventory(adjustment: InventoryAdjustment):
    with engine.begin() as conn:

        product = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE id = :id;
                """
            ),
            {"id": adjustment.product_id},
        ).first()

        if product is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        conn.execute(
            text(
                """
                INSERT INTO inventory_transactions
                (
                    product_id,
                    quantity_change,
                    reason,
                    notes
                )
                VALUES
                (
                    :product_id,
                    :quantity_change,
                    :reason,
                    :notes
                );
                """
            ),
            adjustment.model_dump(),
        )

        conn.execute(
            text(
                """
                UPDATE products
                SET quantity_on_hand =
                    quantity_on_hand + :quantity_change,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :product_id;
                """
            ),
            adjustment.model_dump(),
        )

        updated_product = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE id = :id;
                """
            ),
            {"id": adjustment.product_id},
        ).first()

    return dict(updated_product._mapping)


@app.post("/products")
def create_product(product: ProductCreate):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO products
                (sku, barcode, name, category, description, price_cents, cost_cents, quantity_on_hand)
                VALUES
                (:sku, :barcode, :name, :category, :description, :price_cents, :cost_cents, :quantity_on_hand)
                RETURNING *;
                """
            ),
            product.model_dump(),
        ).first()

    return dict(result._mapping)


@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductUpdate):
    fields = product.model_dump(exclude_unset=True)

    if not fields:
        raise HTTPException(
            status_code=400,
            detail="No update fields provided"
        )

    set_clause = ", ".join(
        [f"{key} = :{key}" for key in fields.keys()]
    )

    query = f"""
        UPDATE products
        SET {set_clause},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *;
    """

    fields["id"] = product_id

    with engine.begin() as conn:
        result = conn.execute(
            text(query),
            fields
        ).first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return dict(result._mapping)


@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                DELETE FROM products
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": product_id},
        ).first()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {
        "deleted": True,
        "product": dict(result._mapping)
    }