from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.location import Province, District, Neighborhood
from app.schemas.location import ProvinceOut, DistrictOut, NeighborhoodOut, ProvinceWithDistricts

router = APIRouter(prefix="/locations", tags=["Lokasyonlar"])


@router.get("/provinces", response_model=List[ProvinceOut])
def get_provinces(db: Session = Depends(get_db)):
    return db.query(Province).order_by(Province.name).all()


@router.get("/provinces/{province_id}", response_model=ProvinceWithDistricts)
def get_province(province_id: int, db: Session = Depends(get_db)):
    province = db.query(Province).filter(Province.id == province_id).first()
    if not province:
        raise HTTPException(status_code=404, detail="İl bulunamadı")
    districts = db.query(District).filter(District.province_id == province_id).order_by(District.name).all()
    result = ProvinceWithDistricts.model_validate(province)
    result.districts = [DistrictOut.model_validate(d) for d in districts]
    return result


@router.get("/districts/{province_id}", response_model=List[DistrictOut])
def get_districts(province_id: int, db: Session = Depends(get_db)):
    return db.query(District).filter(District.province_id == province_id).order_by(District.name).all()


@router.get("/neighborhoods/{district_id}", response_model=List[NeighborhoodOut])
def get_neighborhoods(district_id: int, db: Session = Depends(get_db)):
    return db.query(Neighborhood).filter(Neighborhood.district_id == district_id).order_by(Neighborhood.name).all()
