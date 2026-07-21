from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CourierBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    depot_id: int
    vehicle_id: Optional[int] = None
    daily_delivery_limit: int = 30


class CourierCreate(CourierBase):
    pass


class CourierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    depot_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CourierOut(CourierBase):
    id: int
    status: str
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    depot_name: Optional[str] = None

    class Config:
        from_attributes = True
