from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VehicleBase(BaseModel):
    plate: str
    type: str = "car"
    capacity_kg: float = 100.0
    brand: Optional[str] = None
    model: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    plate: Optional[str] = None
    type: Optional[str] = None
    capacity_kg: Optional[float] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class VehicleOut(VehicleBase):
    id: int
    year: Optional[int] = None
    current_mileage: Optional[float] = None
    depot_id: Optional[int] = None
    vehicle_type: Optional[str] = None
    status: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
