from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, crud
from database import SessionLocal, engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    description="A complete system for managing products, customers, orders, and inventory",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# ── Products ─────────────────────────────────────────────────────────────────
@app.post("/products/", response_model=schemas.Product, status_code=201, tags=["Products"])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    existing = crud.get_product_by_sku(db, sku=product.sku)
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{product.sku}' already exists")
    return crud.create_product(db=db, product=product)

@app.get("/products/", response_model=List[schemas.Product], tags=["Products"])
def list_products(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    return crud.get_products(db, skip=skip, limit=limit, search=search, low_stock=low_stock)

@app.get("/products/{product_id}", response_model=schemas.Product, tags=["Products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.put("/products/{product_id}", response_model=schemas.Product, tags=["Products"])
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = crud.get_product(db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.sku and product.sku != db_product.sku:
        existing = crud.get_product_by_sku(db, sku=product.sku)
        if existing:
            raise HTTPException(status_code=400, detail=f"SKU '{product.sku}' is already taken")
    return crud.update_product(db=db, product_id=product_id, product=product)

@app.delete("/products/{product_id}", tags=["Products"])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    crud.delete_product(db=db, product_id=product_id)
    return {"message": "Product deleted successfully"}

@app.patch("/products/{product_id}/stock", response_model=schemas.Product, tags=["Products"])
def adjust_stock(product_id: int, adjustment: schemas.StockAdjustment, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    new_stock = product.stock_quantity + adjustment.quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail=f"Cannot reduce stock below 0. Current: {product.stock_quantity}")
    return crud.update_stock(db=db, product_id=product_id, quantity=new_stock)

# ── Customers ─────────────────────────────────────────────────────────────────
@app.post("/customers/", response_model=schemas.Customer, status_code=201, tags=["Customers"])
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    existing = crud.get_customer_by_email(db, email=customer.email)
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with email '{customer.email}' already exists")
    return crud.create_customer(db=db, customer=customer)

@app.get("/customers/", response_model=List[schemas.Customer], tags=["Customers"])
def list_customers(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_customers(db, skip=skip, limit=limit, search=search)

@app.get("/customers/{customer_id}", response_model=schemas.Customer, tags=["Customers"])
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.put("/customers/{customer_id}", response_model=schemas.Customer, tags=["Customers"])
def update_customer(customer_id: int, customer: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db, customer_id=customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.email and customer.email != db_customer.email:
        existing = crud.get_customer_by_email(db, email=customer.email)
        if existing:
            raise HTTPException(status_code=400, detail=f"Email '{customer.email}' is already taken")
    return crud.update_customer(db=db, customer_id=customer_id, customer=customer)

@app.delete("/customers/{customer_id}", tags=["Customers"])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    crud.delete_customer(db=db, customer_id=customer_id)
    return {"message": "Customer deleted successfully"}

# ── Orders ────────────────────────────────────────────────────────────────────
@app.post("/orders/", response_model=schemas.Order, status_code=201, tags=["Orders"])
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id=order.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate all items and check stock
    for item in order.items:
        product = crud.get_product(db, product_id=item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, Requested: {item.quantity}"
            )
    
    return crud.create_order(db=db, order=order)

@app.get("/orders/", response_model=List[schemas.Order], tags=["Orders"])
def list_orders(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_orders(db, skip=skip, limit=limit, customer_id=customer_id, status=status)

@app.get("/orders/{order_id}", response_model=schemas.Order, tags=["Orders"])
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.patch("/orders/{order_id}/status", response_model=schemas.Order, tags=["Orders"])
def update_order_status(order_id: int, status_update: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    return crud.update_order_status(db=db, order_id=order_id, status=status_update.status)

@app.delete("/orders/{order_id}", tags=["Orders"])
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    crud.delete_order(db=db, order_id=order_id)
    return {"message": "Order deleted successfully"}

# ── Dashboard / Stats ─────────────────────────────────────────────────────────
@app.get("/dashboard/stats", tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)
