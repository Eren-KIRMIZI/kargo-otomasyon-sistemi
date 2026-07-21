from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class VehicleMaintenance(Base):
    """Araç bakım planları ve geçmişi."""
    __tablename__ = "vehicle_maintenance"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(String(100), nullable=False)   # Periyodik bakım, lastik, yağ, vs.
    description = Column(Text, nullable=True)
    cost = Column(Float, nullable=True)
    status = Column(String(20), default="scheduled")         # scheduled | in_progress | completed
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    performed_by = Column(String(150), nullable=True)        # Servis adı
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="maintenance_records")


class FuelLog(Base):
    """Araç yakıt alım kayıtları."""
    __tablename__ = "fuel_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    liters = Column(Float, nullable=False)
    cost_per_liter = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    odometer_km = Column(Float, nullable=True)              # Sayaç değeri
    fuel_station = Column(String(200), nullable=True)
    filled_by = Column(String(150), nullable=True)          # Sürücü adı
    filled_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="fuel_logs")
