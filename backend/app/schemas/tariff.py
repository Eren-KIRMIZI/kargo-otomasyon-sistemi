from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TariffBase(BaseModel):
    name: str
    base_price: float = 50.0
    price_per_kg: float = 10.0
    price_per_desi: float = 12.0
    is_active: bool = True

class TariffCreate(TariffBase):
    pass

class TariffOut(TariffBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignBase(BaseModel):
    name: str
    code: str
    discount_percentage: float = 0.0
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignOut(CampaignBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
