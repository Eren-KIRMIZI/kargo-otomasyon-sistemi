from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.fleet import VehicleMaintenance, FuelLog
from app.models.vehicle import Vehicle

router = APIRouter(tags=["Filo Yönetimi"])


# ── Schemas ─────────────────────────────────────────────────────

class MaintenanceCreate(BaseModel):
    vehicle_id: int
    maintenance_type: str
    description: Optional[str] = None
    cost: Optional[float] = None
    status: str = "scheduled"
    scheduled_date: Optional[datetime] = None
    performed_by: Optional[str] = None

class MaintenanceUpdate(BaseModel):
    status: Optional[str] = None
    completed_date: Optional[datetime] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None

class MaintenanceOut(BaseModel):
    id: int; vehicle_id: int; maintenance_type: str
    description: Optional[str] = None; cost: Optional[float] = None
    status: str
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    performed_by: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class FuelLogCreate(BaseModel):
    vehicle_id: int
    liters: float
    cost_per_liter: Optional[float] = None
    total_cost: Optional[float] = None
    odometer_km: Optional[float] = None
    fuel_station: Optional[str] = None
    filled_by: Optional[str] = None

class FuelLogOut(BaseModel):
    id: int; vehicle_id: int; liters: float
    cost_per_liter: Optional[float] = None
    total_cost: Optional[float] = None
    odometer_km: Optional[float] = None
    fuel_station: Optional[str] = None
    filled_by: Optional[str] = None
    filled_at: datetime
    class Config: from_attributes = True


# ── Maintenance Endpoints ────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/maintenance", response_model=List[MaintenanceOut])
def get_maintenance(vehicle_id: int, db: Session = Depends(get_db)):
    return db.query(VehicleMaintenance).filter(
        VehicleMaintenance.vehicle_id == vehicle_id
    ).order_by(VehicleMaintenance.scheduled_date.desc()).all()

@router.get("/maintenance", response_model=List[MaintenanceOut])
def list_all_maintenance(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(VehicleMaintenance)
    if status: q = q.filter(VehicleMaintenance.status == status)
    return q.order_by(VehicleMaintenance.scheduled_date.desc()).all()

@router.post("/maintenance", response_model=MaintenanceOut, status_code=201)
def create_maintenance(payload: MaintenanceCreate, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(404, "Araç bulunamadı")
    m = VehicleMaintenance(**payload.model_dump())
    db.add(m)
    if payload.status == "in_progress":
        vehicle.status = "maintenance"
    db.commit(); db.refresh(m)
    return m

@router.patch("/maintenance/{maintenance_id}", response_model=MaintenanceOut)
def update_maintenance(maintenance_id: int, payload: MaintenanceUpdate, db: Session = Depends(get_db)):
    m = db.query(VehicleMaintenance).filter(VehicleMaintenance.id == maintenance_id).first()
    if not m:
        raise HTTPException(404, "Bakım kaydı bulunamadı")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    # Bakım tamamlandıysa aracı aktife al
    if payload.status == "completed":
        m.completed_date = m.completed_date or datetime.utcnow()
        vehicle = db.query(Vehicle).filter(Vehicle.id == m.vehicle_id).first()
        if vehicle:
            vehicle.status = "active"
    db.commit(); db.refresh(m)
    return m


# ── Fuel Log Endpoints ───────────────────────────────────────────

@router.get("/vehicles/{vehicle_id}/fuel-logs", response_model=List[FuelLogOut])
def get_fuel_logs(vehicle_id: int, db: Session = Depends(get_db)):
    return db.query(FuelLog).filter(
        FuelLog.vehicle_id == vehicle_id
    ).order_by(FuelLog.filled_at.desc()).all()

@router.get("/fuel-logs", response_model=List[FuelLogOut])
def list_all_fuel_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(FuelLog).order_by(FuelLog.filled_at.desc()).limit(limit).all()

@router.post("/fuel-logs", response_model=FuelLogOut, status_code=201)
def add_fuel_log(payload: FuelLogCreate, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(404, "Araç bulunamadı")
    data = payload.model_dump()
    # Toplam maliyet otomatik hesaplama
    if data.get("liters") and data.get("cost_per_liter") and not data.get("total_cost"):
        data["total_cost"] = round(data["liters"] * data["cost_per_liter"], 2)
    log = FuelLog(**data)
    db.add(log); db.commit(); db.refresh(log)
    return log
