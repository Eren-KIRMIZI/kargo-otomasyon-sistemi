from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.depot import Depot
from app.models.location import Province, District
from app.schemas.depot import DepotCreate, DepotUpdate, DepotOut, NearestDepotResponse
from app.services.haversine import find_nearest

router = APIRouter(prefix="/depots", tags=["Depolar"])


def _enrich_depot(depot: Depot, db: Session) -> dict:
    province = db.query(Province).filter(Province.id == depot.province_id).first()
    district = db.query(District).filter(District.id == depot.district_id).first() if depot.district_id else None
    courier_count = depot.couriers.filter_by(is_active=True).count()
    active_orders = depot.orders.filter_by(status="in_transit").count()
    d = {c.name: getattr(depot, c.name) for c in depot.__table__.columns}
    d["province_name"] = province.name if province else None
    d["district_name"] = district.name if district else None
    d["courier_count"] = courier_count
    d["active_order_count"] = active_orders
    return d


@router.get("", response_model=List[DepotOut])
def list_depots(
    is_active: Optional[bool] = None,
    province_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Depot)
    if is_active is not None:
        q = q.filter(Depot.is_active == is_active)
    if province_id:
        q = q.filter(Depot.province_id == province_id)
    depots = q.order_by(Depot.name).all()
    return [_enrich_depot(d, db) for d in depots]


@router.get("/nearest", response_model=NearestDepotResponse)
def nearest_depot(
    lat: float = Query(..., description="Hedef enlem"),
    lon: float = Query(..., description="Hedef boylam"),
    db: Session = Depends(get_db)
):
    depots = db.query(Depot).filter(Depot.is_active == True).all()
    if not depots:
        raise HTTPException(status_code=404, detail="Aktif depo bulunamadı")

    candidates = [
        {"id": d.id, "latitude": d.latitude, "longitude": d.longitude, "_depot": d}
        for d in depots
    ]
    best, dist = find_nearest(lat, lon, candidates)
    depot_obj = best["_depot"]
    return {"depot": _enrich_depot(depot_obj, db), "distance_km": round(dist, 2)}


@router.get("/{depot_id}", response_model=DepotOut)
def get_depot(depot_id: int, db: Session = Depends(get_db)):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    return _enrich_depot(depot, db)


@router.post("", response_model=DepotOut, status_code=201)
def create_depot(payload: DepotCreate, db: Session = Depends(get_db)):
    depot = Depot(**payload.model_dump())
    db.add(depot)
    db.commit()
    db.refresh(depot)
    return _enrich_depot(depot, db)


@router.put("/{depot_id}", response_model=DepotOut)
def update_depot(depot_id: int, payload: DepotUpdate, db: Session = Depends(get_db)):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(depot, field, value)
    db.commit()
    db.refresh(depot)
    return _enrich_depot(depot, db)


@router.delete("/{depot_id}", status_code=204)
def delete_depot(depot_id: int, db: Session = Depends(get_db)):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    db.delete(depot)
    db.commit()
