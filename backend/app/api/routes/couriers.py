from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.courier import Courier
from app.models.depot import Depot
from app.schemas.courier import CourierCreate, CourierUpdate, CourierOut

router = APIRouter(prefix="/couriers", tags=["Kuryeler"])


def _enrich_courier(c: Courier, db: Session) -> dict:
    depot = db.query(Depot).filter(Depot.id == c.depot_id).first()
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d["depot_name"] = depot.name if depot else None
    return d


@router.get("", response_model=List[CourierOut])
def list_couriers(
    depot_id: Optional[int] = None,
    status: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Courier)
    if depot_id:
        q = q.filter(Courier.depot_id == depot_id)
    if status:
        q = q.filter(Courier.status == status)
    if is_active is not None:
        q = q.filter(Courier.is_active == is_active)
    couriers = q.order_by(Courier.name).all()
    return [_enrich_courier(c, db) for c in couriers]


@router.get("/{courier_id}", response_model=CourierOut)
def get_courier(courier_id: int, db: Session = Depends(get_db)):
    c = db.query(Courier).filter(Courier.id == courier_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kurye bulunamadı")
    return _enrich_courier(c, db)


@router.post("", response_model=CourierOut, status_code=201)
def create_courier(payload: CourierCreate, db: Session = Depends(get_db)):
    c = Courier(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _enrich_courier(c, db)


@router.put("/{courier_id}", response_model=CourierOut)
def update_courier(courier_id: int, payload: CourierUpdate, db: Session = Depends(get_db)):
    c = db.query(Courier).filter(Courier.id == courier_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kurye bulunamadı")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return _enrich_courier(c, db)


@router.delete("/{courier_id}", status_code=204)
def delete_courier(courier_id: int, db: Session = Depends(get_db)):
    c = db.query(Courier).filter(Courier.id == courier_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kurye bulunamadı")
    db.delete(c)
    db.commit()
