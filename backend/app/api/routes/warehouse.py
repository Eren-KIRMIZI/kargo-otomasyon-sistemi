import random, string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.warehouse import WarehouseRack, InventoryLog, Transfer
from app.models.depot import Depot

router = APIRouter(tags=["Depo ve Raf Yönetimi"])


# ── Schemas ─────────────────────────────────────────────────────

class RackCreate(BaseModel):
    depot_id: int
    code: str
    description: Optional[str] = None
    capacity: int = 50

class RackOut(BaseModel):
    id: int; depot_id: int; code: str
    description: Optional[str] = None
    capacity: int; current_load: int; is_active: bool
    created_at: datetime
    class Config: from_attributes = True

class InventoryLogCreate(BaseModel):
    depot_id: int
    order_id: Optional[int] = None
    rack_id: Optional[int] = None
    action: str          # "in" | "out"
    note: Optional[str] = None
    created_by: Optional[str] = None

class InventoryLogOut(BaseModel):
    id: int; depot_id: int; order_id: Optional[int] = None
    rack_id: Optional[int] = None; action: str
    note: Optional[str] = None; created_by: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class TransferCreate(BaseModel):
    from_depot_id: int
    to_depot_id: int
    vehicle_id: Optional[int] = None
    courier_id: Optional[int] = None
    cargo_count: int = 0
    notes: Optional[str] = None
    departure_time: Optional[datetime] = None

class TransferOut(BaseModel):
    id: int; transfer_number: str
    from_depot_id: int; to_depot_id: int
    vehicle_id: Optional[int] = None; courier_id: Optional[int] = None
    status: str; cargo_count: int
    notes: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    created_at: datetime
    from_depot_name: Optional[str] = None
    to_depot_name: Optional[str] = None
    class Config: from_attributes = True


def _gen_transfer_number() -> str:
    return "TRF" + "".join(random.choices(string.digits, k=8))


# ── Rack Endpoints ───────────────────────────────────────────────

@router.get("/racks", response_model=List[RackOut])
def list_racks(depot_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(WarehouseRack)
    if depot_id:
        q = q.filter(WarehouseRack.depot_id == depot_id)
    return q.order_by(WarehouseRack.code).all()

@router.post("/racks", response_model=RackOut, status_code=201)
def create_rack(payload: RackCreate, db: Session = Depends(get_db)):
    rack = WarehouseRack(**payload.model_dump())
    db.add(rack); db.commit(); db.refresh(rack)
    return rack

@router.delete("/racks/{rack_id}", status_code=204)
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    rack = db.query(WarehouseRack).filter(WarehouseRack.id == rack_id).first()
    if not rack:
        raise HTTPException(404, "Raf bulunamadı")
    db.delete(rack); db.commit()


# ── Inventory Log Endpoints ──────────────────────────────────────

@router.get("/inventory-logs", response_model=List[InventoryLogOut])
def list_logs(depot_id: Optional[int] = None, action: Optional[str] = None,
              limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(InventoryLog)
    if depot_id: q = q.filter(InventoryLog.depot_id == depot_id)
    if action:   q = q.filter(InventoryLog.action == action)
    return q.order_by(InventoryLog.created_at.desc()).limit(limit).all()

@router.post("/inventory-logs", response_model=InventoryLogOut, status_code=201)
def create_log(payload: InventoryLogCreate, db: Session = Depends(get_db)):
    log = InventoryLog(**payload.model_dump())
    db.add(log)
    # Raf yükleme güncellemesi
    if payload.rack_id:
        rack = db.query(WarehouseRack).filter(WarehouseRack.id == payload.rack_id).first()
        if rack:
            rack.current_load += 1 if payload.action == "in" else -1
            rack.current_load = max(0, rack.current_load)
    db.commit(); db.refresh(log)
    return log


# ── Transfer Endpoints ───────────────────────────────────────────

@router.get("/transfers", response_model=List[TransferOut])
def list_transfers(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Transfer)
    if status: q = q.filter(Transfer.status == status)
    transfers = q.order_by(Transfer.created_at.desc()).all()
    result = []
    for t in transfers:
        d = {col.name: getattr(t, col.name) for col in t.__table__.columns}
        d["from_depot_name"] = t.from_depot.name if t.from_depot else None
        d["to_depot_name"] = t.to_depot.name if t.to_depot else None
        result.append(d)
    return result

@router.post("/transfers", response_model=TransferOut, status_code=201)
def create_transfer(payload: TransferCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    transfer = Transfer(**data, transfer_number=_gen_transfer_number())
    db.add(transfer); db.commit(); db.refresh(transfer)
    d = {col.name: getattr(transfer, col.name) for col in transfer.__table__.columns}
    d["from_depot_name"] = transfer.from_depot.name if transfer.from_depot else None
    d["to_depot_name"] = transfer.to_depot.name if transfer.to_depot else None
    return d

@router.patch("/transfers/{transfer_id}/complete", response_model=TransferOut)
def complete_transfer(transfer_id: int, db: Session = Depends(get_db)):
    t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not t:
        raise HTTPException(404, "Transfer bulunamadı")
    t.status = "completed"
    t.arrival_time = datetime.utcnow()
    db.commit(); db.refresh(t)
    d = {col.name: getattr(t, col.name) for col in t.__table__.columns}
    d["from_depot_name"] = t.from_depot.name if t.from_depot else None
    d["to_depot_name"] = t.to_depot.name if t.to_depot else None
    return d
