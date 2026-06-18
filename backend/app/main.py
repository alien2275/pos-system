import os
from typing import Literal, Optional, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://100.85.171.19:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    reorder_level: int = 0
    image_url: Optional[str] = None
    public_description: Optional[str] = None
    is_public: bool = False


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    cost_cents: Optional[int] = None
    quantity_on_hand: Optional[int] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    public_description: Optional[str] = None
    is_public: Optional[bool] = None


class InventoryAdjustment(BaseModel):
    product_id: int
    quantity_change: int
    reason: Literal[
        "Shipment",
        "Sale",
        "Return",
        "Damage",
        "Adjustment",
        "Transfer"
    ]
    notes: Optional[str] = None


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int


class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    

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
            text(
                """
                SELECT *
                FROM products
                WHERE is_active = TRUE
                ORDER BY id;
                """
            )
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
    

@app.get("/products/inactive-match")
def get_inactive_product_match(sku: str = "", barcode: str = ""):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE is_active = FALSE
                  AND (
                    (:sku <> '' AND sku = :sku)
                    OR (:barcode <> '' AND barcode = :barcode)
                  )
                LIMIT 1;
                """
            ),
            {"sku": sku, "barcode": barcode},
        ).first()

    if result is None:
        raise HTTPException(status_code=404, detail="No inactive product found")

    return dict(result._mapping)


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


@app.get("/categories")
def get_categories():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT DISTINCT category
                FROM products
                WHERE category IS NOT NULL
                  AND category <> ''
                ORDER BY category;
                """
            )
        )

        return [row[0] for row in result]
    

@app.get("/products/category/{category}")
def get_products_by_category(category: str):
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE category = :category
                ORDER BY name;
                """
            ),
            {"category": category},
        )

        return [
            dict(row._mapping)
            for row in result
        ]
    

@app.get("/dashboard")
def get_dashboard():
    with engine.connect() as conn:
        product_summary = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) AS product_count,
                    COUNT(*) FILTER (
                        WHERE is_active = TRUE
                          AND reorder_level > 0
                          AND quantity_on_hand <= reorder_level
                    ) AS low_stock_count
                FROM products;
                """
            )
        ).first()

        sales_summary = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) AS today_sale_count,
                    COALESCE(SUM(total_cents), 0) AS today_revenue_cents
                FROM sales
                WHERE created_at::date = CURRENT_DATE;
                """
            )
        ).first()

    return {
        "products": dict(product_summary._mapping),
        "sales": dict(sales_summary._mapping),
    }


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
    

@app.get("/sales")
def get_sales():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM sales
                ORDER BY created_at DESC;
                """
            )
        )

        return [dict(row._mapping) for row in result]
    

@app.get("/sales/today")
def get_today_sales():
    with engine.connect() as conn:
        sales = conn.execute(
            text(
                """
                SELECT *
                FROM sales
                WHERE created_at::date = CURRENT_DATE
                ORDER BY created_at DESC;
                """
            )
        )

        summary = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) AS sale_count,
                    COALESCE(SUM(total_cents), 0) AS total_cents
                FROM sales
                WHERE created_at::date = CURRENT_DATE;
                """
            )
        ).first()

        return {
            "summary": dict(summary._mapping),
            "sales": [dict(row._mapping) for row in sales],
        }

@app.get("/sales/range")
def get_sales_range(start_date: str, end_date: str):
    with engine.connect() as conn:
        sales = conn.execute(
            text(
                """
                SELECT *
                FROM sales
                WHERE created_at >= :start_date
                  AND created_at < (CAST(:end_date AS date) + INTERVAL '1 day')
                ORDER BY created_at DESC;
                """
            ),
            {
                "start_date": start_date,
                "end_date": end_date,
            },
        )

        summary = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) AS sale_count,
                    COALESCE(SUM(total_cents), 0) AS total_cents
                FROM sales
                WHERE created_at >= :start_date
                  AND created_at < (CAST(:end_date AS date) + INTERVAL '1 day');
                """
            ),
            {
                "start_date": start_date,
                "end_date": end_date,
            },
        ).first()

        return {
            "summary": dict(summary._mapping),
            "sales": [dict(row._mapping) for row in sales],
        }
    
    
@app.get("/sales/{sale_id}")
def get_sale(sale_id: int):
    with engine.connect() as conn:
        sale = conn.execute(
            text("SELECT * FROM sales WHERE id = :id;"),
            {"id": sale_id},
        ).first()

        if sale is None:
            raise HTTPException(status_code=404, detail="Sale not found")

        items = conn.execute(
            text(
                """
                SELECT
                    sale_items.id,
                    sale_items.sale_id,
                    sale_items.product_id,
                    products.name,
                    sale_items.quantity,
                    sale_items.price_cents
                FROM sale_items
                JOIN products ON products.id = sale_items.product_id
                WHERE sale_items.sale_id = :sale_id
                ORDER BY sale_items.id;
                """
            ),
            {"sale_id": sale_id},
        )

        return {
            "sale": dict(sale._mapping),
            "items": [dict(row._mapping) for row in items],
        }
    

@app.get("/inventory/low-stock")
def get_low_stock_products():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM products
                WHERE is_active = TRUE
                  AND reorder_level > 0
                  AND quantity_on_hand <= reorder_level
                ORDER BY quantity_on_hand ASC, name ASC;
                """
            )
        )

        return [dict(row._mapping) for row in result]
    

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
                (
                    sku,
                    barcode,
                    name,
                    category,
                    description,
                    price_cents,
                    cost_cents,
                    quantity_on_hand,
                    reorder_level,
                    image_url,
                    public_description,
                    is_public
                )
                VALUES
                (
                    :sku,
                    :barcode,
                    :name,
                    :category,
                    :description,
                    :price_cents,
                    :cost_cents,
                    :quantity_on_hand,
                    :reorder_level,
                    :image_url,
                    :public_description,
                    :is_public
                )
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


@app.post("/sales")
def create_sale(sale: SaleCreate):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Sale must contain at least one item")

    with engine.begin() as conn:
        total_cents = 0
        sale_items_data = []

        for item in sale.items:
            product = conn.execute(
                text("SELECT * FROM products WHERE id = :id;"),
                {"id": item.product_id},
            ).first()

            if product is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {item.product_id} not found"
                )

            product_data = dict(product._mapping)

            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Quantity must be greater than zero"
                )

            if product_data["quantity_on_hand"] < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough inventory for {product_data['name']}"
                )

            line_total = product_data["price_cents"] * item.quantity
            total_cents += line_total

            sale_items_data.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price_cents": product_data["price_cents"],
                "name": product_data["name"],
            })

        sale_row = conn.execute(
            text(
                """
                INSERT INTO sales (total_cents)
                VALUES (:total_cents)
                RETURNING *;
                """
            ),
            {"total_cents": total_cents},
        ).first()

        sale_id = sale_row._mapping["id"]

        for item in sale_items_data:
            conn.execute(
                text(
                    """
                    INSERT INTO sale_items
                    (sale_id, product_id, quantity, price_cents)
                    VALUES
                    (:sale_id, :product_id, :quantity, :price_cents);
                    """
                ),
                {
                    "sale_id": sale_id,
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "price_cents": item["price_cents"],
                },
            )

            conn.execute(
                text(
                    """
                    UPDATE products
                    SET quantity_on_hand = quantity_on_hand - :quantity,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :product_id;
                    """
                ),
                {
                    "quantity": item["quantity"],
                    "product_id": item["product_id"],
                },
            )

            conn.execute(
                text(
                    """
                    INSERT INTO inventory_transactions
                    (product_id, quantity_change, reason, notes)
                    VALUES
                    (:product_id, :quantity_change, 'Sale', :notes);
                    """
                ),
                {
                    "product_id": item["product_id"],
                    "quantity_change": -item["quantity"],
                    "notes": f"Sale #{sale_id}",
                },
            )

    return {
        "id": sale_id,
        "total_cents": total_cents,
        "items": sale_items_data,
    }



@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                UPDATE products
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": product_id},
        ).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"deleted": True, "product": dict(result._mapping)}