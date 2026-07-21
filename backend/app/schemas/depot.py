from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DepotBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    province_id: int
    district_id: Optional[int] = None
    latitude: float
    longitude: float
    capacity: int = 1000
    phone: Optional[str] = None
    manager_name: Optional[str] = None


class DepotCreate(DepotBase):
    pass


class DepotUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None
    is_active: Optional[bool] = None


class DepotOut(DepotBase):
    id: int
    is_active: bool
    created_at: datetime
    province_name: Optional[str] = None
    district_name: Optional[str] = None
    courier_count: Optional[int] = 0
    active_order_count: Optional[int] = 0

    class Config:
        from_attributes = True


class NearestDepotResponse(BaseModel):
    depot: DepotOut
    distance_km: float
