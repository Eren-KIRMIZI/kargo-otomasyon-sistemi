from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OrderStatusLogOut(BaseModel):
    id: int
    status: str
    location_note: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    recipient_address: str
    province_id: int
    district_id: Optional[int] = None
    neighborhood: Optional[str] = None
    latitude: float
    longitude: float
    weight_kg: float = 1.0
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    desi: float = 1.0
    priority: str = "normal"
    notes: Optional[str] = None
    payment_method: Optional[str] = None


class OrderCreate(OrderBase):
    sender_customer_id: Optional[int] = None
    receiver_customer_id: Optional[int] = None
    tariff_id: Optional[int] = None
    campaign_id: Optional[int] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    assigned_depot_id: Optional[int] = None
    courier_id: Optional[int] = None
    zone_id: Optional[int] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_proof_url: Optional[str] = None
    delivery_note: Optional[str] = None
    is_paid: Optional[bool] = None


class OrderOut(OrderBase):
    id: int
    tracking_number: str
    status: str
    sender_customer_id: Optional[int] = None
    receiver_customer_id: Optional[int] = None
    assigned_depot_id: Optional[int] = None
    courier_id: Optional[int] = None
    zone_id: Optional[int] = None
    tariff_id: Optional[int] = None
    base_price: Optional[float] = None
    discount_amount: float = 0.0
    total_price: Optional[float] = None
    is_paid: bool = False
    delivery_proof_url: Optional[str] = None
    delivery_note: Optional[str] = None
    created_at: datetime
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    province_name: Optional[str] = None
    district_name: Optional[str] = None
    depot_name: Optional[str] = None
    courier_name: Optional[str] = None
    status_logs: List[OrderStatusLogOut] = []

    class Config:
        from_attributes = True


class OrderAssignResponse(BaseModel):
    order_id: int
    assigned_depot_id: int
    depot_name: str
    distance_km: float
    message: str


class OrderAssignCourierResponse(BaseModel):
    order_id: int
    courier_id: int
    courier_name: str
    distance_km: float
    message: str


class ReturnOrderCreate(BaseModel):
    original_order_id: int
    reason: Optional[str] = None


class ReturnOrderOut(BaseModel):
    id: int
    return_tracking_number: str
    original_order_id: int
    reason: Optional[str] = None
    status: str
    courier_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrackingOut(BaseModel):
    """Public tracking response - kargo takip sayfası için"""
    tracking_number: str
    status: str
    customer_name: str
    receiver_name: Optional[str] = None
    province_name: Optional[str] = None
    district_name: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    status_logs: List[OrderStatusLogOut] = []

    class Config:
        from_attributes = True
