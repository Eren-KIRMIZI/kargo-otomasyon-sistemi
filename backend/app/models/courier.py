from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum





class CourierStatus(str, enum.Enum):
    AVAILABLE = "available"
    ON_DELIVERY = "on_delivery"
    OFF_DUTY = "off_duty"


class Courier(Base):
    __tablename__ = "couriers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    status = Column(String(20), default=CourierStatus.AVAILABLE)
    daily_delivery_limit = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    depot = relationship("Depot", back_populates="couriers")
    vehicle = relationship("Vehicle", back_populates="couriers")
    orders = relationship("Order", back_populates="courier", lazy="dynamic")
