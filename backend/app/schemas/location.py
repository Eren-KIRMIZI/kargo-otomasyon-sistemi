from pydantic import BaseModel
from typing import Optional, List


class NeighborhoodOut(BaseModel):
    id: int
    name: str
    district_id: int

    class Config:
        from_attributes = True


class DistrictOut(BaseModel):
    id: int
    name: str
    province_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class DistrictWithNeighborhoods(DistrictOut):
    neighborhoods: List[NeighborhoodOut] = []


class ProvinceOut(BaseModel):
    id: int
    name: str
    code: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class ProvinceWithDistricts(ProvinceOut):
    districts: List[DistrictOut] = []
