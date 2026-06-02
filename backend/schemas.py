from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# ── Product Schemas ───────────────────────────────────────────────────────────
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    stock_quantity: int = Field(..., ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    category: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None

class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StockAdjustment(BaseModel):
    quantity: int
    reason: Optional[str] = None

# ── Customer Schemas ──────────────────────────────────────────────────────────
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1)
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ── Order Schemas ─────────────────────────────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product: Optional[Product] = None

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class Order(BaseModel):
    id: int
    customer_id: int
    status: str
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer: Optional[Customer] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
