from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.incident import Incident
from app.api.deps import get_current_user

router = APIRouter(prefix="/incidents", tags=["Olay & İhlal Yönetimi"])


class IncidentCreate(BaseModel):
    type: str  # lost, damaged, complaint, courier_report
    tracking_number: Optional[str] = None
    order_id: Optional[int] = None
    courier_id: Optional[int] = None
    description: str

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

class IncidentOut(BaseModel):
    id: int
    type: str
    status: str
    tracking_number: Optional[str]
    order_id: Optional[int]
    courier_id: Optional[int]
    customer_id: Optional[int]
    description: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


@router.get("", response_model=List[IncidentOut])
def list_incidents(
    type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(Incident)
    if type:
        q = q.filter(Incident.type == type)
    if status:
        q = q.filter(Incident.status == status)
    return q.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/stats")
def incident_stats(db: Session = Depends(get_db)):
    total = db.query(Incident).count()
    open_ = db.query(Incident).filter(Incident.status == "open").count()
    investigating = db.query(Incident).filter(Incident.status == "investigating").count()
    resolved = db.query(Incident).filter(Incident.status == "resolved").count()
    
    by_type = {}
    for t in ["lost", "damaged", "complaint", "courier_report"]:
        by_type[t] = db.query(Incident).filter(Incident.type == t).count()
    
    return {
        "total": total,
        "open": open_,
        "investigating": investigating,
        "resolved": resolved,
        "by_type": by_type,
    }


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    incident = Incident(
        **payload.model_dump(),
        customer_id=current_user.id,
        status="open",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Olay kaydı bulunamadı")
    return inc


@router.put("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Olay kaydı bulunamadı")
    data = payload.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.utcnow()
    for k, v in data.items():
        setattr(inc, k, v)
    db.commit()
    db.refresh(inc)
    return inc


@router.delete("/{incident_id}", status_code=204)
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Olay kaydı bulunamadı")
    db.delete(inc)
    db.commit()
