import os
import uuid
from typing import Literal, Optional, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", "uploads")
PRODUCT_UPLOAD_DIR = os.path.join(UPLOAD_ROOT, "products")
EVENT_UPLOAD_DIR = os.path.join(UPLOAD_ROOT, "events")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024

os.makedirs(PRODUCT_UPLOAD_DIR, exist_ok=True)
os.makedirs(EVENT_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

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


class EventCreate(BaseModel):
    title: str
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    image_url: Optional[str] = None
    is_public: bool = True


class EventUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    image_url: Optional[str] = None
    is_public: Optional[bool] = None


@app.on_event("startup")
def ensure_event_table():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    location TEXT,
                    description TEXT,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    image_url TEXT,
                    is_public BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS event_images (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    image_url TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS online_orders (
                    id SERIAL PRIMARY KEY,
                    customer_name TEXT,
                    customer_email TEXT,
                    shipping_name TEXT,
                    shipping_address_line1 TEXT,
                    shipping_address_line2 TEXT,
                    shipping_city TEXT,
                    shipping_state TEXT,
                    shipping_postal_code TEXT,
                    shipping_country TEXT,
                    payment_provider TEXT,
                    payment_reference TEXT,
                    status TEXT NOT NULL DEFAULT 'pending_fulfillment',
                    total_cents INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS online_order_items (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(id),
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    price_cents INTEGER NOT NULL
                );
                """
            )
        )
    

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


@app.get("/store/products")
def get_store_products():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT
                    id,
                    sku,
                    name,
                    category,
                    public_description,
                    image_url,
                    price_cents,
                    quantity_on_hand
                FROM products
                WHERE is_active = TRUE
                  AND is_public = TRUE
                  AND quantity_on_hand > 0
                ORDER BY category NULLS LAST, name ASC;
                """
            )
        )

        return [
            dict(row._mapping)
            for row in result
        ]


@app.get("/store/events")
def get_store_events():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM events
                WHERE is_public = TRUE
                  AND COALESCE(end_date, start_date) >= CURRENT_DATE
                ORDER BY start_date ASC, title ASC;
                """
            )
        )

        return [dict(row._mapping) for row in result]


@app.get("/store/past-events")
def get_store_past_events():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM events
                WHERE is_public = TRUE
                  AND COALESCE(end_date, start_date) < CURRENT_DATE
                ORDER BY start_date DESC, title ASC;
                """
            )
        )

        return [dict(row._mapping) for row in result]


@app.get("/events")
def get_events():
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT *
                FROM events
                ORDER BY start_date DESC, title ASC;
                """
            )
        )

        return [dict(row._mapping) for row in result]


@app.get("/events/{event_id}/images")
def get_event_images(event_id: int):
    with engine.connect() as conn:
        event = conn.execute(
            text("SELECT * FROM events WHERE id = :id;"),
            {"id": event_id},
        ).first()

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        result = conn.execute(
            text(
                """
                SELECT *
                FROM event_images
                WHERE event_id = :event_id
                ORDER BY created_at DESC, id DESC;
                """
            ),
            {"event_id": event_id},
        )

        return [dict(row._mapping) for row in result]


@app.post("/events")
def create_event(event: EventCreate):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO events
                (
                    title,
                    location,
                    description,
                    start_date,
                    end_date,
                    image_url,
                    is_public
                )
                VALUES
                (
                    :title,
                    :location,
                    :description,
                    :start_date,
                    :end_date,
                    :image_url,
                    :is_public
                )
                RETURNING *;
                """
            ),
            event.model_dump(),
        ).first()

    return dict(result._mapping)


@app.put("/events/{event_id}")
def update_event(event_id: int, event: EventUpdate):
    fields = event.model_dump(exclude_unset=True)

    if not fields:
        raise HTTPException(status_code=400, detail="No update fields provided")

    set_clause = ", ".join([f"{key} = :{key}" for key in fields.keys()])

    query = f"""
        UPDATE events
        SET {set_clause},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
        RETURNING *;
    """

    fields["id"] = event_id

    with engine.begin() as conn:
        result = conn.execute(text(query), fields).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return dict(result._mapping)


@app.post("/events/{event_id}/image")
async def upload_event_image(event_id: int, file: UploadFile = File(...)):
    with engine.connect() as conn:
        event = conn.execute(
            text("SELECT * FROM events WHERE id = :id;"),
            {"id": event_id},
        ).first()

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    _, extension = os.path.splitext(file.filename or "")
    extension = extension.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Image must be a JPG, PNG, WebP, or GIF file",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    contents = await file.read()

    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    filename = f"event-{event_id}-{uuid.uuid4().hex}{extension}"
    disk_path = os.path.join(EVENT_UPLOAD_DIR, filename)
    image_url = f"/uploads/events/{filename}"

    with open(disk_path, "wb") as image_file:
        image_file.write(contents)

    with engine.begin() as conn:
        updated_event = conn.execute(
            text(
                """
                UPDATE events
                SET image_url = :image_url,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": event_id, "image_url": image_url},
        ).first()

    return dict(updated_event._mapping)


@app.post("/events/{event_id}/images")
async def upload_event_gallery_image(event_id: int, file: UploadFile = File(...)):
    with engine.connect() as conn:
        event = conn.execute(
            text("SELECT * FROM events WHERE id = :id;"),
            {"id": event_id},
        ).first()

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    _, extension = os.path.splitext(file.filename or "")
    extension = extension.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Image must be a JPG, PNG, WebP, or GIF file",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    contents = await file.read()

    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    filename = f"event-{event_id}-gallery-{uuid.uuid4().hex}{extension}"
    disk_path = os.path.join(EVENT_UPLOAD_DIR, filename)
    image_url = f"/uploads/events/{filename}"

    with open(disk_path, "wb") as image_file:
        image_file.write(contents)

    with engine.begin() as conn:
        event_image = conn.execute(
            text(
                """
                INSERT INTO event_images (event_id, image_url)
                VALUES (:event_id, :image_url)
                RETURNING *;
                """
            ),
            {"event_id": event_id, "image_url": image_url},
        ).first()

    return dict(event_image._mapping)


@app.delete("/event-images/{image_id}")
def delete_event_image(image_id: int):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                DELETE FROM event_images
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": image_id},
        ).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Event image not found")

    return {"deleted": True, "image": dict(result._mapping)}


@app.delete("/events/{event_id}")
def delete_event(event_id: int):
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                DELETE FROM events
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": event_id},
        ).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"deleted": True, "event": dict(result._mapping)}


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

        online_order_summary = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE status IN ('pending_fulfillment', 'paid')
                    ) AS pending_fulfillment_count
                FROM online_orders;
                """
            )
        ).first()

    return {
        "products": dict(product_summary._mapping),
        "sales": dict(sales_summary._mapping),
        "online_orders": dict(online_order_summary._mapping),
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


@app.post("/products/{product_id}/image")
async def upload_product_image(product_id: int, file: UploadFile = File(...)):
    with engine.connect() as conn:
        product = conn.execute(
            text("SELECT * FROM products WHERE id = :id;"),
            {"id": product_id},
        ).first()

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    _, extension = os.path.splitext(file.filename or "")
    extension = extension.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Image must be a JPG, PNG, WebP, or GIF file",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    contents = await file.read()

    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    filename = f"product-{product_id}-{uuid.uuid4().hex}{extension}"
    disk_path = os.path.join(PRODUCT_UPLOAD_DIR, filename)
    image_url = f"/uploads/products/{filename}"

    with open(disk_path, "wb") as image_file:
        image_file.write(contents)

    with engine.begin() as conn:
        updated_product = conn.execute(
            text(
                """
                UPDATE products
                SET image_url = :image_url,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                RETURNING *;
                """
            ),
            {"id": product_id, "image_url": image_url},
        ).first()

    return dict(updated_product._mapping)


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
