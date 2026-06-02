from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import models, schemas
from decimal import Decimal

# ── Products ──────────────────────────────────────────────────────────────────
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, low_stock: Optional[bool] = None):
    query = db.query(models.Product)
    if search:
        query = query.filter(
            or_(
                models.Product.name.ilike(f"%{search}%"),
                models.Product.sku.ilike(f"%{search}%"),
                models.Product.category.ilike(f"%{search}%")
            )
        )
    if low_stock is True:
        query = query.filter(models.Product.stock_quantity <= models.Product.low_stock_threshold)
    return query.offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    update_data = product.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    db.delete(db_product)
    db.commit()

def update_stock(db: Session, product_id: int, quantity: int):
    db_product = get_product(db, product_id)
    db_product.stock_quantity = quantity
    db.commit()
    db.refresh(db_product)
    return db_product

# ── Customers ─────────────────────────────────────────────────────────────────
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.Customer)
    if search:
        query = query.filter(
            or_(
                models.Customer.name.ilike(f"%{search}%"),
                models.Customer.email.ilike(f"%{search}%"),
                models.Customer.phone.ilike(f"%{search}%")
            )
        )
    return query.offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(db: Session, customer_id: int, customer: schemas.CustomerUpdate):
    db_customer = get_customer(db, customer_id)
    update_data = customer.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    db.delete(db_customer)
    db.commit()

# ── Orders ────────────────────────────────────────────────────────────────────
def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100, customer_id: Optional[int] = None, status: Optional[str] = None):
    query = db.query(models.Order)
    if customer_id:
        query = query.filter(models.Order.customer_id == customer_id)
    if status:
        query = query.filter(models.Order.status == status)
    return query.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order: schemas.OrderCreate):
    # Create order
    db_order = models.Order(
        customer_id=order.customer_id,
        notes=order.notes,
        status="pending",
        total_amount=Decimal("0")
    )
    db.add(db_order)
    db.flush()  # get the order id

    total = Decimal("0")
    for item in order.items:
        product = get_product(db, item.product_id)
        unit_price = Decimal(str(product.price))
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price
        )
        db.add(db_item)
        # Reduce stock
        product.stock_quantity -= item.quantity
        total += unit_price * item.quantity

    db_order.total_amount = total
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, status: str):
    db_order = get_order(db, order_id)
    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int):
    db_order = get_order(db, order_id)
    # Restore stock
    for item in db_order.items:
        product = get_product(db, item.product_id)
        if product:
            product.stock_quantity += item.quantity
    db.delete(db_order)
    db.commit()

# ── Dashboard ─────────────────────────────────────────────────────────────────
def get_dashboard_stats(db: Session):
    total_products = db.query(func.count(models.Product.id)).scalar()
    total_customers = db.query(func.count(models.Customer.id)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    
    total_revenue = db.query(func.sum(models.Order.total_amount)).filter(
        models.Order.status != "cancelled"
    ).scalar() or Decimal("0")
    
    low_stock_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_quantity <= models.Product.low_stock_threshold
    ).scalar()
    
    pending_orders = db.query(func.count(models.Order.id)).filter(
        models.Order.status == "pending"
    ).scalar()

    recent_orders = db.query(models.Order).order_by(
        models.Order.created_at.desc()
    ).limit(5).all()

    low_stock_products = db.query(models.Product).filter(
        models.Product.stock_quantity <= models.Product.low_stock_threshold
    ).limit(5).all()

    order_status_counts = db.query(
        models.Order.status, func.count(models.Order.id)
    ).group_by(models.Order.status).all()

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "low_stock_count": low_stock_count,
        "pending_orders": pending_orders,
        "recent_orders": [
            {
                "id": o.id,
                "customer_id": o.customer_id,
                "status": o.status,
                "total_amount": float(o.total_amount),
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in recent_orders
        ],
        "low_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "stock_quantity": p.stock_quantity,
                "low_stock_threshold": p.low_stock_threshold
            }
            for p in low_stock_products
        ],
        "order_status_breakdown": {status: count for status, count in order_status_counts}
    }
