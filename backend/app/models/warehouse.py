from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class WarehouseRack(Base):
    """Depo içi raf sistemi."""
    __tablename__ = "warehouse_racks"

    id = Column(Integer, primary_key=True, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    code = Column(String(50), nullable=False)        # Örn: A-01-03 (Koridor-Sıra-Kat)
    description = Column(String(200), nullable=True)
    capacity = Column(Integer, default=50)           # Max kargo adedi
    current_load = Column(Integer, default=0)        # Anlık kargo adedi
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    depot = relationship("Depot", back_populates="racks")


class InventoryLog(Base):
    """Depoya giriş-çıkış kayıtları (kabul & sevk)."""
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    rack_id = Column(Integer, ForeignKey("warehouse_racks.id"), nullable=True)
    action = Column(String(20), nullable=False)    # "in" = Kabul | "out" = Sevk
    note = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    depot = relationship("Depot")
    rack = relationship("WarehouseRack")


class Transfer(Base):
    """Şubeler / depolar arası kargo transfer işlemleri."""
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(30), nullable=False, unique=True, index=True)
    from_depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    to_depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)
    status = Column(String(20), default="pending")  # pending | in_transit | completed | cancelled
    cargo_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    departure_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    from_depot = relationship("Depot", foreign_keys=[from_depot_id])
    to_depot = relationship("Depot", foreign_keys=[to_depot_id])
    vehicle = relationship("Vehicle")
    courier = relationship("Courier")
