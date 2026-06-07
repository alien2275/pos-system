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
    description: Optional[str] = None
    price_cents: int = 0
    cost_cents: int = 0
    quantity_on_hand: int = 0


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    cost_cents: Optional[int] = None
    quantity_on_hand: Optional[int] = None
    is_active: Optional[bool] = None


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


@app.post("/products")
def create_product(product: ProductCreate):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO products
                (sku, barcode, name, description, price_cents, cost_cents, quantity_on_hand)
                VALUES
                (:sku, :barcode, :name, :description, :price_cents, :cost_cents, :quantity_on_hand)
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