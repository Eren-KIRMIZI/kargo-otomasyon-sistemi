from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class Depot(Base):
    __tablename__ = "depots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=False, unique=True)
    address = Column(Text, nullable=True)
    province_id = Column(Integer, ForeignKey("provinces.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=1000)  # Günlük kapasite
    is_active = Column(Boolean, default=True)
    phone = Column(String(20), nullable=True)
    manager_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    province = relationship("Province", back_populates="depots")
    district = relationship("District")
    couriers = relationship("Courier", back_populates="depot", lazy="dynamic")
    orders = relationship("Order", back_populates="assigned_depot", lazy="dynamic")
    zone_assignments = relationship("ZoneAssignment", back_populates="depot", lazy="dynamic")
    racks = relationship("WarehouseRack", back_populates="depot", cascade="all, delete-orphan")

